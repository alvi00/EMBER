/**
 * Shared embedding helpers (server-only). The same model and settings are used at build time
 * (scripts/ts/build-embeddings.ts) and at query time (/api/ask), so vectors are comparable.
 */
import path from "node:path";

export const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";
export const EMBEDDING_DIM = 384;
/** Model files are cached inside the project so the copilot works with the network off. */
export const MODEL_CACHE_DIR = path.join(process.cwd(), "models-cache");

export type QuantizedEmbeddings = {
  model: string;
  dim: number;
  count: number;
  ids: string[];
  /** Per-vector scale: float ≈ int8 × scale. */
  scales: number[];
  /** Base64 of an Int8Array of length count × dim. */
  data: string;
};

type Extractor = (texts: string | string[], opts: { pooling: "mean"; normalize: boolean }) => Promise<{ tolist(): number[][] }>;

let extractorPromise: Promise<Extractor> | null = null;

export async function getExtractor(): Promise<Extractor> {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { pipeline, env } = await import("@huggingface/transformers");
      env.cacheDir = MODEL_CACHE_DIR;
      const pipe = await pipeline("feature-extraction", EMBEDDING_MODEL, { dtype: "q8" });
      return pipe as unknown as Extractor;
    })();
    extractorPromise.catch(() => {
      extractorPromise = null;
    });
  }
  return extractorPromise;
}

export async function embed(texts: string[]): Promise<number[][]> {
  const extractor = await getExtractor();
  const out = await extractor(texts, { pooling: "mean", normalize: true });
  return out.tolist();
}

export function quantize(vectors: number[][], ids: string[], model = EMBEDDING_MODEL): QuantizedEmbeddings {
  const dim = vectors[0]?.length ?? EMBEDDING_DIM;
  const buf = new Int8Array(vectors.length * dim);
  const scales: number[] = [];
  vectors.forEach((v, i) => {
    const max = Math.max(...v.map((x) => Math.abs(x))) || 1;
    const scale = max / 127;
    scales.push(Number(scale.toPrecision(6)));
    for (let j = 0; j < dim; j++) buf[i * dim + j] = Math.round(v[j] / scale);
  });
  return { model, dim, count: vectors.length, ids, scales, data: Buffer.from(buf.buffer).toString("base64") };
}

export function dequantize(q: QuantizedEmbeddings): Float32Array[] {
  const bytes = Buffer.from(q.data, "base64");
  const ints = new Int8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out: Float32Array[] = [];
  for (let i = 0; i < q.count; i++) {
    const v = new Float32Array(q.dim);
    let norm = 0;
    for (let j = 0; j < q.dim; j++) {
      v[j] = ints[i * q.dim + j] * q.scales[i];
      norm += v[j] * v[j];
    }
    norm = Math.sqrt(norm) || 1;
    for (let j = 0; j < q.dim; j++) v[j] /= norm;
    out.push(v);
  }
  return out;
}

export function cosine(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}
