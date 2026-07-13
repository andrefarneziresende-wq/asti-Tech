/**
 * Corre uma promise com um limite de tempo. Se o limite for atingido antes da
 * promise original resolver, a promise retornada rejeita com `message` —
 * isso não cancela a operação original, mas garante que o chamador não fique
 * esperando pra sempre (importante em jobs de background que têm um tempo
 * máximo de execução na plataforma, como a Vercel).
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer)) as Promise<T>;
}
