import { JwtRefreshStrategy } from './jwt-refresh.strategy';

describe('JwtRefreshStrategy', () => {
  let strategy: JwtRefreshStrategy;

  beforeEach(() => {
    strategy = new JwtRefreshStrategy();
  });

  it('maps JWT payload sub/email to id/email', () => {
    const result = strategy.validate({ sub: 'user-1', email: 'a@test.com' });

    expect(result).toEqual({ id: 'user-1', email: 'a@test.com' });
  });
});
