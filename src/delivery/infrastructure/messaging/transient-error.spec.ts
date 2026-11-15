import { QueryFailedError } from 'typeorm';
import { isTransientInfrastructureError } from './transient-error';

const withCode = (code: string, message = 'boom') =>
  Object.assign(new Error(message), { code });

describe('isTransientInfrastructureError', () => {
  it.each([
    ['ECONNREFUSED', withCode('ECONNREFUSED')],
    ['ETIMEDOUT', withCode('ETIMEDOUT')],
    ['SQLSTATE 57P03 (cannot_connect_now)', withCode('57P03')],
    [
      'SQLSTATE 08xxx dans un QueryFailedError',
      new QueryFailedError('q', [], { code: '08001' } as never),
    ],
    [
      'unicité 23505 (course entre deux order.ready)',
      new QueryFailedError('q', [], { code: '23505' } as never),
    ],
    ['connexion pg coupée', new Error('Connection terminated unexpectedly')],
    ['pool pg saturé', new Error('timeout exceeded when trying to connect')],
    [
      'TypeORM non connecté',
      Object.assign(new Error('x'), { name: 'ConnectionIsNotSetError' }),
    ],
    [
      'AggregateError de connexions refusées',
      new AggregateError([withCode('ECONNREFUSED')], ''),
    ],
    [
      'erreur enveloppée (cause)',
      Object.assign(new Error('wrap'), { cause: withCode('ECONNRESET') }),
    ],
  ])('transitoire : %s', (_label, error) => {
    expect(isTransientInfrastructureError(error)).toBe(true);
  });

  it.each([
    [
      'TypeError',
      new TypeError("Cannot read properties of undefined (reading 'country')"),
    ],
    ['Error sans code', new Error('inattendu')],
    [
      'QueryFailedError non transitoire (23502)',
      new QueryFailedError('q', [], { code: '23502' } as never),
    ],
    ['valeur non Error', 'ECONNREFUSED'],
    ['null', null],
  ])('définitive : %s', (_label, error) => {
    expect(isTransientInfrastructureError(error)).toBe(false);
  });
});
