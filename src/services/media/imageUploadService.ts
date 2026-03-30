import { getSupabaseClient } from "../sync/supabaseClient";

export type ImageBucket = "avatars" | "visions" | "memories";

// Cache de buckets que já foram verificados/criados nesta sessão.
// Evita verificar a existência do bucket em cada upload.
const _ensuredBuckets = new Set<string>();

/**
 * Garante que o bucket existe no Supabase Storage.
 * Se não existir, tenta criá-lo como público.
 * Erros de criação são ignorados silenciosamente (ex: já existe via race condition).
 */
async function ensureBucketExists(
  client: Awaited<ReturnType<typeof getSupabaseClient>>,
  bucket: ImageBucket,
): Promise<void> {
  if (!client) return;
  if (_ensuredBuckets.has(bucket)) return;

  // Tenta listar os buckets para verificar se o bucket existe.
  const { data: buckets, error: listError } = await client.storage.listBuckets();

  if (!listError && buckets) {
    const exists = buckets.some((b: { name: string }) => b.name === bucket);
    if (exists) {
      _ensuredBuckets.add(bucket);
      return;
    }
  }

  // Bucket não encontrado — tenta criar.
  // public: true permite leitura pública sem token de autenticação.
  const { error: createError } = await client.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"],
  });

  // Ignora erro "already exists" (pode ocorrer em corrida entre requisições).
  if (createError && !createError.message?.toLowerCase().includes("already exists")) {
    console.warn(`[imageUpload] Não foi possível criar bucket "${bucket}":`, createError.message);
    // Não lança erro — o upload vai tentar mesmo assim e falhar com mensagem clara.
  } else {
    _ensuredBuckets.add(bucket);
    console.log(`[imageUpload] Bucket "${bucket}" criado com sucesso.`);
  }
}

export interface UploadImageParams {
  userId: string;
  bucket: ImageBucket;
  localUri: string;
  filePrefix?: string;
}

export interface UploadImageResult {
  url: string;
  path: string;
}

function getFileExtension(uri: string): string {
  const clean = uri.split("?")[0];
  const ext = clean.split(".").pop()?.toLowerCase();
  if (!ext || ext.length > 5) return "jpg";
  return ext;
}

function getContentType(ext: string): string {
  switch (ext) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "jpg":
    case "jpeg":
    default:
      return "image/jpeg";
  }
}

// Limite máximo de tamanho do arquivo para upload (5MB).
// Valores maiores que isso são improváveis para fotos de perfil/visão.
// Aumentar para "visions" (dreamboard) pode fazer sentido no futuro.
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB = 5 * 1024 * 1024 bytes

// Tipos de arquivo aceitos para upload de imagem.
// MIME types são identificadores padronizados de formato de arquivo.
// Ex: "image/jpeg" = arquivo .jpg/.jpeg; "image/png" = arquivo .png.
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/**
 * Upload de imagem para Supabase Storage.
 * Retorna URL persistente (pública) + caminho interno do storage.
 *
 * CORREÇÃO: adicionadas validações de tamanho e tipo antes do upload.
 * Antes: enviava qualquer arquivo sem limite — usuário poderia enviar
 * um vídeo de 500MB sem nenhum aviso, travando o app e esgotando quota.
 */
export async function uploadUserImage({
  userId,
  bucket,
  localUri,
  filePrefix,
}: UploadImageParams): Promise<UploadImageResult> {
  const client = await getSupabaseClient();
  if (!client) {
    throw new Error("Supabase não configurado");
  }

  const ext = getFileExtension(localUri);
  const contentType = getContentType(ext);
  const path = `${userId}/${filePrefix ?? bucket}-${Date.now()}.${ext}`;

  // fetch() baixa o arquivo do URI local para memória como um Response.
  // No React Native, URIs locais de imagens (file://... ou content://...) são suportados.
  const response = await fetch(localUri);
  const blob = await response.blob();
  // blob.size = tamanho em bytes do arquivo baixado.

  // VALIDAÇÃO 1: Tamanho do arquivo.
  // Verificamos APÓS o fetch para ter o tamanho real do arquivo.
  // Alternativa seria usar expo-file-system para checar antes de baixar,
  // mas fetch() é mais portável entre plataformas.
  if (blob.size > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (blob.size / (1024 * 1024)).toFixed(1); // Bytes → MB com 1 decimal.
    throw new Error(
      `Arquivo muito grande: ${sizeMB}MB. O limite é ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.`
    );
  }

  // VALIDAÇÃO 2: Tipo de arquivo (MIME type).
  // blob.type retorna o MIME type detectado pelo browser/sistema.
  // Isso é mais confiável que verificar apenas a extensão do nome do arquivo,
  // porque um usuário mal-intencionado poderia renomear "malware.exe" para "photo.jpg".
  const detectedType = blob.type || contentType; // Fallback para contentType calculado pela extensão.
  if (!ALLOWED_MIME_TYPES.has(detectedType)) {
    throw new Error(
      `Tipo de arquivo não suportado: "${detectedType}". Use JPEG, PNG, WebP ou GIF.`
    );
  }

  // Garante que o bucket existe antes de tentar fazer upload.
  // Se o bucket "visions" (ou outro) ainda não foi criado no Supabase,
  // esta função o cria automaticamente como público.
  await ensureBucketExists(client, bucket);

  const { error: uploadError } = await client.storage
    .from(bucket)
    .upload(path, blob, {
      contentType,
      upsert: true,
      cacheControl: "3600",
    });

  if (uploadError) {
    throw new Error(uploadError.message || "Falha ao fazer upload da imagem");
  }

  const {
    data: { publicUrl },
  } = client.storage.from(bucket).getPublicUrl(path);

  if (!publicUrl) {
    throw new Error("Upload realizado, mas URL não foi gerada");
  }

  return { url: publicUrl, path };
}
