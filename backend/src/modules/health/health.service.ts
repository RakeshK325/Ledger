export class HealthService {
  public checkHealth(): { ok: boolean } {
    return { ok: true };
  }
}

export const healthService = new HealthService();
