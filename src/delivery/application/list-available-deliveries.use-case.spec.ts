import { ListAvailableDeliveriesUseCase } from './list-available-deliveries.use-case';
import { InMemoryDeliveryRepository } from './test-doubles';

describe('ListAvailableDeliveriesUseCase', () => {
  let repository: InMemoryDeliveryRepository;

  beforeEach(() => {
    repository = new InMemoryDeliveryRepository();
  });

  it("applique le rayon par défaut quand aucun rayon n'est fourni", async () => {
    const useCase = new ListAvailableDeliveriesUseCase(repository, 5, 50);
    const spy = jest.spyOn(repository, 'findAvailableWithinRadius');

    await useCase.execute({ latitude: 49.4938, longitude: 0.1077 });

    expect(spy).toHaveBeenCalledWith(expect.anything(), 5);
  });

  it("utilise le rayon demandé s'il est sous le maximum", async () => {
    const useCase = new ListAvailableDeliveriesUseCase(repository, 5, 50);
    const spy = jest.spyOn(repository, 'findAvailableWithinRadius');

    await useCase.execute({
      latitude: 49.4938,
      longitude: 0.1077,
      radiusKm: 20,
    });

    expect(spy).toHaveBeenCalledWith(expect.anything(), 20);
  });

  it('plafonne le rayon demandé au maximum configuré', async () => {
    const useCase = new ListAvailableDeliveriesUseCase(repository, 5, 50);
    const spy = jest.spyOn(repository, 'findAvailableWithinRadius');

    await useCase.execute({
      latitude: 49.4938,
      longitude: 0.1077,
      radiusKm: 1000,
    });

    expect(spy).toHaveBeenCalledWith(expect.anything(), 50);
  });
});
