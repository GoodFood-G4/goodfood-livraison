import { TypeOrmAddressRepository } from '../../../address/infrastructure/persistence/typeorm-address.repository';
import { TypeOrmDeliveryRepository } from './typeorm-delivery.repository';
import { TypeOrmUnitOfWork } from './typeorm-unit-of-work';

describe('TypeOrmUnitOfWork', () => {
  const manager = { getRepository: jest.fn(() => ({})) };
  const dataSource = {
    transaction: jest.fn((work: (m: typeof manager) => Promise<unknown>) =>
      work(manager),
    ),
  };
  const unitOfWork = new TypeOrmUnitOfWork(dataSource as never);

  it("fournit des repositories bâtis sur l'EntityManager de la transaction", async () => {
    const result = await unitOfWork.run(async (repositories) => {
      expect(repositories.addresses).toBeInstanceOf(TypeOrmAddressRepository);
      expect(repositories.deliveries).toBeInstanceOf(TypeOrmDeliveryRepository);
      return 'ok';
    });

    expect(result).toBe('ok');
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(manager.getRepository).toHaveBeenCalledTimes(2);
  });

  it("propage l'erreur du travail (TypeORM fait alors le rollback)", async () => {
    await expect(
      unitOfWork.run(async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
  });
});
