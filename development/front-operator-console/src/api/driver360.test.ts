import { describe, expect, it, vi } from 'vitest';

import { getDriver360 } from './driver360';

describe('getDriver360', () => {
  it('requests the driver ops route for a driver summary', async () => {
    const request = vi.fn().mockResolvedValue({ driver_id: '10000000-0000-0000-0000-000000000001' });
    const client = { request };

    await getDriver360(client, '1');

    expect(request).toHaveBeenCalledWith('/driver-ops/drivers/1/');
  });
});
