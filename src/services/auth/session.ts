import { createHmac, timingSafeEqual } from "node:crypto";
export function equalSecret(a: string, b: string) {
  const left = createHmac("sha256", "workspace-compare").update(a).digest();
  const right = createHmac("sha256", "workspace-compare").update(b).digest();
  return timingSafeEqual(left, right);
}
export function issueSession(secret: string, now = Date.now()) {
  const expires = String(now + 7 * 24 * 60 * 60 * 1000);
  return `${expires}.${createHmac("sha256", secret).update(expires).digest("hex")}`;
}
export function validSession(token: string, secret: string, now = Date.now()) {
  const [expires, signature] = token.split(".");
  if (
    !expires ||
    !signature ||
    !Number.isFinite(Number(expires)) ||
    Number(expires) <= now
  )
    return false;
  return equalSecret(
    signature,
    createHmac("sha256", secret).update(expires).digest("hex"),
  );
}
