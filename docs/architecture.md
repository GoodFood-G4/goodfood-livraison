# Architecture

## Les 4 couches et la règle de dépendance

```
presentation  →  application  →  domain
infrastructure ↗
```

- **domain** : TypeScript pur (aucun import `@nestjs/*`, `typeorm`, `amqplib`). Entités avec
  comportement (`Delivery`, `Address`), value objects (`GeoPoint`), services de domaine
  (`EtaCalculator`), ports (interfaces) et erreurs métier.
- **application** : un use case = une classe avec `execute(input)`. Ne connaît que le domaine
  et les ports. Seuls `@Injectable()`/`@Inject(TOKEN)` de Nest sont tolérés.
- **infrastructure** : adaptateurs qui implémentent les ports (TypeORM, RabbitMQ, Nominatim,
  horloge, générateur d'id).
- **presentation** : contrôleurs fins, DTO, guards, filtre d'exceptions.

La règle est outillée : une règle ESLint `no-restricted-imports` fait échouer le lint si
`domain/` importe un framework ou si `application/` importe `typeorm`/`amqplib`/`express`/`pg`.

## Cycle de vie d'une livraison

```mermaid
stateDiagram-v2
    [*] --> pending
    pending --> assigned: accept(courier)
    assigned --> picked_up: advanceTo
    picked_up --> in_transit: advanceTo
    in_transit --> delivered: advanceTo
    delivered --> [*]
```

Règles portées par l'entité `Delivery` (pas par les use cases) :
- `accept` : uniquement depuis `pending`, sinon `DeliveryAlreadyAssignedError` (409). Une
  course simultanée entre deux livreurs est tranchée par le verrou optimiste (`version`) en
  persistance.
- `advanceTo` : seule la transition suivante dans la chaîne est valide, et seulement par le
  livreur assigné, sinon `InvalidStatusTransitionError` (409) ou `NotAssignedCourierError` (403).
- `updateLocation` : uniquement entre `assigned` et `in_transit`, par le livreur assigné.
- Un livreur ne peut pas dépasser `MAX_ACTIVE_DELIVERIES_PER_COURIER` livraisons actives
  (`assigned`/`picked_up`/`in_transit`), sinon `CourierBusyError` (409).

## Flux order.ready → livraison → évènements delivery.*

```mermaid
sequenceDiagram
    participant Commande
    participant RabbitMQ as goodfood.events
    participant Livraison as Service Livraison
    participant DB as PostgreSQL (livraison)

    Commande->>RabbitMQ: order.ready (routing key)
    RabbitMQ->>Livraison: livraison.queue
    Livraison->>Livraison: HandleOrderReadyUseCase
    Livraison->>DB: idempotence : livraison déjà créée pour order_id ?
    alt déjà existante
        Livraison-->>RabbitMQ: ack (aucune duplication)
    else nouvelle commande
        Livraison->>Livraison: CreateAddress x2 (géocodage si besoin)
        Livraison->>Livraison: CreateDelivery (status=pending)
        Livraison->>DB: persiste adresses + livraison
        Livraison-->>RabbitMQ: ack
    end

    Note over Livraison,RabbitMQ: Plus tard, à chaque transition persistée
    Livraison->>RabbitMQ: delivery.assigned / picked_up / started / completed
```

Les mises à jour de position GPS ne sont pas publiées (trop fréquentes) : le suivi se fait par
polling de `GET /deliveries/:id`.

## Compromis assumés

- **Pas d'outbox** : la publication d'évènements `delivery.*` est best-effort (log d'avertissement
  si RabbitMQ est injoignable, la requête HTTP ne doit pas échouer). Un pattern outbox
  (table d'évènements + relai transactionnel) garantirait la publication at-least-once ; hors
  scope de ce POC.
- **Pas de dead-letter queue** : un message `order.ready` invalide ou dont l'adresse n'est pas
  géocodable est `nack` sans requeue, mais n'est pas routé vers une DLQ (celle-ci sera
  configurée dans `goodfood-infra`).
- **Haversine plutôt que PostGIS** : la recherche de livraisons disponibles par rayon utilise une
  formule de Haversine en SQL brut avec pré-filtre bounding box, plutôt qu'une extension
  géospatiale dédiée. Suffisant pour le volume d'un POC, mais moins précis et moins performant
  à grande échelle que PostGIS.
- **Suivi par polling plutôt que push** : le client suit sa livraison en interrogeant
  `GET /deliveries/:id` plutôt que via un flux SSE/WebSocket. Une amélioration future
  consisterait à pousser les mises à jour de position en temps réel.
