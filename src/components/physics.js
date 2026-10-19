export const MAP_LIMIT = 48;

// Pushes `obj` (an Object3D) out of circular obstacles and keeps it
// inside the map.
export function resolveCollisions(obj, radius, obstacles) {
  for (const o of obstacles) {
    const dx = obj.position.x - o.x;
    const dz = obj.position.z - o.z;
    const min = radius + o.radius;
    const d2 = dx * dx + dz * dz;
    if (d2 < min * min) {
      const d = Math.sqrt(d2) || 0.0001;
      obj.position.x = o.x + (dx / d) * min;
      obj.position.z = o.z + (dz / d) * min;
    }
  }
  obj.position.x = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, obj.position.x));
  obj.position.z = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, obj.position.z));
}
