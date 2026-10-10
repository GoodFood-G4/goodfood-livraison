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

Le service écoute sur le port `3003`. La migration de base de données s'exécute
automatiquement au démarrage du conteneur.

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
npm run script:generate-test-jwt -- --role 2 --sub <uuid>
```

`--role` : `1` (client), `2` (livreur) ou `3` (admin franchisé).

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

## Architecture

Voir [`docs/architecture.md`](docs/architecture.md) pour le détail de l'architecture
hexagonale, le cycle de vie d'une livraison et le flux `order.ready`.
