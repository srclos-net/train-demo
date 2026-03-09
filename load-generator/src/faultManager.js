// Manages active faults across regions/stations/kiosks.
// A fault has: { id, type, scope: 'region'|'station'|'all', target, intensity, expiresAt }

export class FaultManager {
  constructor(kiosks) {
    this.kiosks = kiosks; // Map<kioskId, VirtualKiosk>
    this.faults = new Map(); // faultId -> fault
  }

  // Apply a fault to a set of kiosks
  inject({ type, scope, target, intensity = 1.0, durationMs = 60000 }) {
    const id = `${type}-${scope}-${target}-${Date.now()}`;
    const expiresAt = Date.now() + durationMs;

    const affected = this._selectKiosks(scope, target, intensity);
    affected.forEach(k => k.setFault(type, true));

    const fault = { id, type, scope, target, intensity, durationMs, expiresAt, affectedCount: affected.length };
    this.faults.set(id, fault);

    console.log(`[fault] INJECTED ${type} → ${scope}:${target} (${affected.length} kiosks, ${durationMs/1000}s)`);

    // Auto-clear after duration
    setTimeout(() => this.clear(id), durationMs);

    return fault;
  }

  clear(faultId) {
    const fault = this.faults.get(faultId);
    if (!fault) return;

    const affected = this._selectKiosks(fault.scope, fault.target, 1.0);
    // Only clear this fault type if no other active fault of same type covers the kiosk
    affected.forEach(kiosk => {
      const stillActive = [...this.faults.values()].some(f =>
        f.id !== faultId &&
        f.type === fault.type &&
        this._kioskInScope(kiosk, f.scope, f.target)
      );
      if (!stillActive) kiosk.setFault(fault.type, false);
    });

    this.faults.delete(faultId);
    console.log(`[fault] CLEARED ${fault.type} → ${fault.scope}:${fault.target}`);
  }

  clearAll() {
    for (const id of this.faults.keys()) this.clear(id);
  }

  activeFaults() {
    return [...this.faults.values()].filter(f => f.expiresAt > Date.now());
  }

  _selectKiosks(scope, target, intensity) {
    let pool = [];
    if (scope === 'all') {
      pool = [...this.kiosks.values()];
    } else if (scope === 'region') {
      pool = [...this.kiosks.values()].filter(k => k.region === target);
    } else if (scope === 'station') {
      pool = [...this.kiosks.values()].filter(k => k.stationId === target);
    }
    // Apply intensity — randomly select subset
    if (intensity >= 1.0) return pool;
    const count = Math.max(1, Math.round(pool.length * intensity));
    return pool.sort(() => Math.random() - 0.5).slice(0, count);
  }

  _kioskInScope(kiosk, scope, target) {
    if (scope === 'all') return true;
    if (scope === 'region') return kiosk.region === target;
    if (scope === 'station') return kiosk.stationId === target;
    return false;
  }
}
