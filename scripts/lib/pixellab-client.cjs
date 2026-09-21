// Build-time API client. No credentials or API calls are included in the game.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const API = 'https://api.pixellab.ai/v2';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function readJSON(file, fallback = null) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback;
}
function writeJSON(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file + '.tmp', JSON.stringify(value, null, 2) + '\n');
  fs.renameSync(file + '.tmp', file);
}
function loadKey(root, environment = process.env) {
  if (environment.PIXELLAB_API_KEY?.trim()) return environment.PIXELLAB_API_KEY.trim();
  for (const name of ['.env.local', '.env']) {
    const file = path.join(root, name);
    if (!fs.existsSync(file)) continue;
    const match = fs.readFileSync(file, 'utf8').match(/^\s*(?:export\s+)?PIXELLAB_API_KEY\s*=\s*(.*?)\s*$/m);
    if (match) {
      const value = match[1].replace(/^(['"])(.*)\1$/, '$2').trim();
      if (value) return value;
    }
  }
  return '';
}
class PixelLabClient {
  constructor({ key, directory, fetchImpl = fetch, pause = sleep, log = console.log, pollMs = 6000, maxPolls = 150 }) {
    this.key = key; this.directory = directory; this.fetch = fetchImpl;
    this.pause = pause; this.log = log; this.pollMs = pollMs; this.maxPolls = maxPolls;
  }
  async request(endpoint, body) {
    if (!this.key) throw Error('Falta PIXELLAB_API_KEY em .env.local. Nenhuma geração foi enviada.');
    if (!endpoint.startsWith('/') || endpoint.startsWith('//')) throw Error('Invalid API endpoint');
    for (let attempt = 0; ; attempt++) {
      let response;
      try {
        response = await this.fetch(API + endpoint, {
          method: body === undefined ? 'GET' : 'POST', redirect: 'error',
          headers: { Authorization: `Bearer ${this.key}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(90000),
        });
      } catch {
        if(body===undefined && attempt<3){await this.pause(2000*(attempt+1));continue;}
        throw Error(body===undefined?'Falha ao consultar PixelLab. Retome o comando para continuar o trabalho existente.':'Falha de conexão com PixelLab. A requisição paga não será reenviada automaticamente.');
      }
      if (body === undefined && [429, 502, 503, 504].includes(response.status) && attempt < 3) {
        await this.pause(Math.min(30000, Number(response.headers.get('retry-after') || 2 ** attempt) * 1000));
        continue;
      }
      if (!response.ok) {
        const descriptions = {401: 'Chave PixelLab inválida.', 402: 'Saldo PixelLab insuficiente.', 429: 'Limite de trabalhos simultâneos da PixelLab.', 422: 'A PixelLab rejeitou os parâmetros da geração.'};
        const error = Error(descriptions[response.status] || `PixelLab HTTP ${response.status}.`);
        error.status = response.status;
        throw error;
      }
      return response.json();
    }
  }
  async job(label, endpoint, body) {
    const fingerprint = createHash('sha256').update(JSON.stringify({ endpoint, body })).digest('hex');
    const file = path.join(this.directory, fingerprint + '.json');
    let saved = readJSON(file);
    if (saved?.state === 'submitting') throw Error(`${label}: envio anterior sem resposta confirmada. Confira o trabalho na conta PixelLab antes de repetir. Registro: ${file}`);
    if (saved?.state === 'failed') throw Error(`${label}: a geração anterior falhou. O registro foi preservado em ${file}.`);
    if (!saved) {
      if (!this.key) throw Error('Falta PIXELLAB_API_KEY em .env.local. Nenhuma geração foi enviada.');
      saved = { label, endpoint, body, state: 'submitting', createdAt: new Date().toISOString() };
      writeJSON(file, saved);
      try { saved.response = await this.request(endpoint, body); }
      catch (error) {
        // A clear rejection can be retried after configuration/credits are fixed.
        // Ambiguous transport failures stay locked, avoiding duplicate paid jobs.
        if ([401, 402, 422, 429].includes(error.status)) fs.unlinkSync(file);
        throw error;
      }
      saved.jobIds = saved.response.background_job_ids || [saved.response.background_job_id].filter(Boolean);
      if(!saved.jobIds.length && Array.isArray(saved.response.directions) && !saved.response.directions.length){
        fs.unlinkSync(file);const error=Error('PixelLab sem vagas para este lote.');error.status=429;throw error;
      }
      if (!saved.jobIds.length) throw Error(`${label}: resposta sem identificador de trabalho; registro preservado.`);
      saved.completed = [];
      saved.state = 'processing'; writeJSON(file, saved);
      this.log(`${label}: geração enviada.`);
    }
    if (saved.state === 'completed') return saved.response;
    for (let count = 0; count < this.maxPolls; count++) {
      for (const id of saved.jobIds.filter(id => !saved.completed.includes(id))) {
        let result;
        try { result = await this.request('/background-jobs/' + encodeURIComponent(id)); }
        catch (error) {
          // PixelLab may remove finished jobs. Reconcile against the persisted
          // character instead of sending another paid request after a long pause.
          const characterId=saved.response.character_id || body.character_id;
          if(error.status!==404 || !characterId)throw error;
          const character=await this.request('/characters/'+encodeURIComponent(characterId));
          const animation=body.animation_name && character.animations?.find(a=>a.display_name===body.animation_name||a.animation_type===body.animation_name);
          const complete=body.animation_name ? animation && body.directions.every(direction=>animation.directions.some(d=>d.direction===direction&&d.frames.length>0&&d.frames.length===d.frame_count)) :
            character.status==='completed' && character.directions===8 && Object.values(character.rotation_urls||{}).filter(Boolean).length===8;
          if(!complete)throw Error(`${label}: trabalho expirado; resultado completo ainda não está disponível na conta.`);
          result={status:'completed'};
        }
        if (['failed', 'cancelled', 'canceled'].includes(result.status)) {
          saved.state = 'failed';saved.failure=result.last_response?.detail||result.last_response?.error||result.status; writeJSON(file, saved);
          throw Error(`${label}: PixelLab informou falha. Não foi iniciada outra geração.`);
        }
        if (result.status === 'completed') {
          saved.completed.push(id); writeJSON(file, saved);
        }
      }
      if (saved.completed.length === saved.jobIds.length) {
        saved.state = 'completed'; writeJSON(file, saved);
        this.log(`${label}: concluído.`); return saved.response;
      }
      if (count % 5 === 0) this.log(`${label}: aguardando (${saved.completed.length}/${saved.jobIds.length}).`);
      await this.pause(this.pollMs);
    }
    throw Error(`${label}: ainda em processamento. Execute o mesmo comando para retomar sem reenviar.`);
  }
  async download(url, destination) {
    if (fs.existsSync(destination)) return;
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw Error('Invalid asset URL');
    // Public image downloads deliberately have NO Authorization header.
    let bytes;
    for(let attempt=0;;attempt++){
      try{
        const response = await this.fetch(url, { signal: AbortSignal.timeout(90000) });
        if (!response.ok) throw Error(`Download de sprite: HTTP ${response.status}.`);
        bytes=Buffer.from(await response.arrayBuffer());break;
      }catch(error){if(attempt>=3)throw error;await this.pause((attempt+1)*2000);}
    }
    if (bytes.length > 8 * 1024 * 1024 || !bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw Error('Expected a PNG sprite smaller than 8 MB');
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination + '.tmp', bytes); fs.renameSync(destination + '.tmp', destination);
  }
}
module.exports = { PixelLabClient, loadKey, readJSON, writeJSON, API };
