# GoodFood - Service Livraison

Microservice NestJS gérant le cycle de vie des livraisons (acceptation par un livreur,
suivi GPS, statuts) pour la plateforme GoodFood.

## Prérequis

- [Task](https://taskfile.dev/) installé localement
- Docker et Docker Compose
- Le repo [`goodfood-infra`](../goodfood-infra) **démarré au préalable** (RabbitMQ, réseau
  `goodfood-network`) : `task docker:up` depuis ce repo

## Configuration

Copier `.env.example` vers `.env` et ajuster si besoin (le `JWT_SECRET` doit être identique à
celui du service Auth).

```bash
cp .env.example .env
```

## Démarrage

```bash
task docker:up
```

Le service écoute sur le port `3003`. Les migrations s'exécutent automatiquement au démarrage
de l'image de production (`task docker:up-prod`) ; en dev (`task docker:up`), les lancer à la
main : `docker compose -f .docker/docker-compose.yml -f .docker/docker-compose.override.yml exec livraison-service npm run migration:run`.

Autres commandes utiles : `task docker:down`, `task docker:logs`, `task docker:up-prod`.

## Tests

```bash
task test       # suite Jest
task test:cov   # avec couverture (lcov)
task lint       # ESLint
task format     # Prettier
```

## Documentation API

Une fois le service démarré, la documentation Swagger est disponible sur
`http://localhost:3003/api`.

## Générer un JWT de test

En l'absence du service Auth, un JWT HS256 valide peut être généré localement pour tester
l'API via Swagger :

```bash
npm run script:generate-test-jwt -- --role 2 --sub <uuid> [--expires-in 24h]
```

`--role` : `1` (client), `2` (livreur) ou `3` (admin franchisé). Le token contient `iat` et
`exp` (24 h par défaut ; `--expires-in` accepte des secondes ou `30m`, `2h`, `7d`). Un token
expiré est refusé (401).

## Simuler un évènement order.ready

En l'absence du service Commande, un message `order.ready` d'exemple peut être publié
directement sur RabbitMQ :

```bash
npm run script:publish-order-ready
```

Pour peupler rapidement 3 livraisons de démonstration autour du Havre (utile pour tester
l'application mobile) :

```bash
npm run script:seed-demo
```

## Conventions de l'API

- **Dates** (réponses HTTP et événements) : ISO 8601 UTC à la seconde, terminées par `Z`
  (`2026-11-11T21:55:25Z`).
- **Horodatages** de `GET /deliveries/:id` (et des autres réponses de livraison) :
  `assigned_at`, `picked_up_at`, `started_at`, `completed_at`, `null` tant que l'étape n'est pas
  atteinte, identiques aux dates des événements `delivery.*`. `accepted_at` / `delivered_at`
  restent comme alias dépréciés. `courier_location.updated_at` date la dernière position.
- **Accès** : la ressource d'un autre utilisateur (livraison d'un autre client, non assignée au
  livreur, adresse créée par un autre) renvoie **404**, comme une ressource inconnue. **403** est
  réservé à un rôle non autorisé sur la route. Détail par route dans Swagger.
- `PATCH /deliveries/:id/location` sur une livraison terminée : 409 « La position ne peut plus
  être mise à jour : la livraison est terminée ».

## Messages RabbitMQ

- **Consommé** : `order.ready` (`livraison.queue`). Dates ISO 8601 UTC acceptées avec `Z`.
  Adresses géocodées d'abord, puis adresses + livraison enregistrées dans une seule
  transaction. Rejet sans remise en file vers `livraison.dlq` (configurée dans `goodfood-infra`,
  rien à déclarer ici) : message invalide (champ obligatoire absent ou mal typé, adresse absente
  ou incomplète), adresse non géocodable, erreur inattendue (log ERROR avec `order_id`). Seule
  une erreur d'infrastructure transitoire (base injoignable, connexion perdue, timeout) est
  remise en file, après 2 s et une seule fois : si elle persiste sur le message redélivré, il
  part en DLQ.
- **Publiés** (best effort, persistants) : `delivery.assigned|picked_up|started|completed`,
  payload `delivery_id`, `order_id`, `courier_id` + `assigned_at|picked_up_at|started_at|completed_at`
  (UTC à la seconde, ex. `2026-11-11T21:29:07Z`).

Les logs INFO tracent chaque livraison créée (`order_id`, `delivery_id`) et chaque événement
publié ; l'adresse postale n'est jamais loguée.

## Architecture

Voir [`docs/architecture.md`](docs/architecture.md) pour le détail de l'architecture
hexagonale, le cycle de vie d'une livraison et le flux `order.ready`.
