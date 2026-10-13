# Meiro

Site de marque React + TypeScript + Vite. Contenu visiteur en mongol, logo SVG fourni conservé sans modification et aucune image générée.

## Démarrage

```sh
npm install
npm run dev
```

Le serveur local est disponible sur http://localhost:5173.

```sh
npm run build
npm run preview
npm test
```

Les tests utilisent le support TypeScript natif de Node 22.18+ (ou Node 24+).

## Organisation

- `src/pages/` : accueil, catalogue, détail produit, contact et page 404.
- `src/components/` : navigation, footer, placeholders, cartes produit et carousel.
- `src/data/products.ts` : données temporaires typées, catégories, variantes et prix en MNT.
- `src/data/site.ts` : navigation et liens sociaux officiels.
- `src/services/contact.ts` : adaptateur vers le futur service d'envoi.
- `src/commerce/` : contrats pour panier, checkout et paiement ; stockage local versionné.
- `src/styles.css` : palette, typographie, styles responsive et réduction des animations.

## Photographies et produits définitifs

Tous les rectangles portent `IMAGE` et une description photographique en mongol. Le composant `ImagePlaceholder` conserve le ratio prévu pour chaque emplacement. Remplacer son contenu par une image avec `object-fit: cover` et un texte alternatif décrivant la véritable photo. Le logo original est dans `public/meiro-logo.svg`.

Les six produits sont des exemples (`isPlaceholder: true`, `availability: 'preview'`). Les prix restent `null`, affichés comme à venir. Remplacer les données et confirmer les noms, descriptions, prix, variantes et stocks avant toute activation des achats. Aucun bouton de paiement ni commande factice n'est présenté.

## Formulaire

Sans `VITE_CONTACT_ENDPOINT`, l'envoi est désactivé et le visiteur est orienté vers les réseaux sociaux. Les champs restent consultables. Pour activer l'envoi :

1. Créer un endpoint backend qui valide les champs, limite les abus et envoie réellement le message.
2. Copier `.env.example` en `.env.local` et renseigner le chemin de cet endpoint.
3. Retourner un code 2xx uniquement après acceptation effective du message. Recompiler le frontend.

Le corps JSON contient `name`, `contact`, `subject` et `message`. Les secrets du fournisseur d'envoi doivent rester côté serveur. Aucun message ou donnée personnelle n'est enregistré dans le navigateur.

## Panier et extension commerce / Bonum

L'interface `CheckoutService` constitue un point d'intégration futur, pas une implémentation de paiement. Bonum est le prestataire prévu pour la prochaine étape.

Le panier est accessible via `/cart` et les fiches produit. Une variante précise
est requise ; couleur et matériau sont affichés. Les variantes épuisées, sans prix
valide ou sans disponibilité connue ne peuvent pas être ajoutées. Les variantes
`made_to_order` restent sélectionnables et sont identifiées comme telles.
Le navigateur conserve uniquement identifiants et quantités dans `meiro.cart.v1`.
Le panier reste présent après connexion et déconnexion et se synchronise entre
onglets ; il n'est pas synchronisé entre appareils. Un message signale les échecs
de stockage.

À l'ouverture du panier, prix et disponibilité sont relus depuis le catalogue.
Les lignes devenues indisponibles restent visibles, peuvent être retirées et sont
exclues du total. Le total concerne les articles, sans frais de livraison.
Le panier ne réserve pas de stock et ne crée pas de commande. L'API catalogue
expose un statut de disponibilité, sans quantité exacte : le plafond de 99 par
variante est une limite d'interface, pas une promesse de stock.

Pour activer les achats : créer un backend de commandes et intégrer Bonum.
Le serveur devra recalculer les montants depuis une source fiable, contrôler et
réserver les stocks dans une transaction, créer les demandes de paiement puis
vérifier leur règlement côté serveur avec traitement idempotent des notifications.
Les secrets de paiement restent côté serveur. Les variantes et quantités du panier
doivent être validées côté serveur avant toute commande.

## Comptes clients

Les routes `/account`, `/account/login`, `/account/signup`,
`/account/forgot-password` et `/account/reset-password` utilisent le client
Supabase existant. Les clients peuvent lire leur profil et modifier uniquement
`full_name` et `phone`. La table `public.profiles` doit être créée avec une clé
étrangère vers `auth.users`, un trigger de création et les règles RLS par utilisateur.
La migration `supabase/migrations/20261013050000_customer_profiles.sql` a été
exécutée séparément dans Supabase ; elle n'est pas exécutée par le frontend.
Ne pas la réexécuter sur la base où `profiles` existe déjà.
L'administration conserve son contrôle distinct via `admin_profiles`.

L'inscription et la demande d'e-mail de récupération sont désactivées par défaut.
Avant leur ouverture :

1. Configurer le SMTP personnalisé et tester la délivrance des e-mails.
2. Activer **Allow new users to sign up** et **Confirm Email** dans Supabase.
3. Régler la longueur minimale du mot de passe sur 12 caractères.
4. Mettre à jour **Site URL** et autoriser la racine exacte du site dans **Redirect URLs**.
   Adresse provisoire : `https://gregboil.github.io/Meiro_site/`.
5. Activer `VITE_AUTH_EMAILS_ENABLED=true` dans l'environnement de build.
   Pour GitHub Pages, créer cette **variable Actions** dans Settings → Secrets and
   variables → Actions → Variables, puis reconstruire le site.
6. Tester confirmation, récupération, liens expirés, connexion, modification du
   profil et déconnexion avec deux comptes pour vérifier l'isolation RLS.

Le flag frontend évite de proposer des envois avant configuration ; il ne remplace
pas les paramètres d'inscription et de sécurité côté Supabase.
Les liens utilisent la racine du site, sans route hash. L'initialisation Supabase
valide les liens et consomme les tokens avant le montage de HashRouter, puis ouvre
le compte ou le formulaire de nouveau mot de passe. Le flux navigateur reste le
flux implicite du client Supabase actuel ; un changement vers PKCE doit adapter et
tester les retours de récupération.
Les pages client ne présentent pas encore d'historique de commandes : panier,
commandes, livraison et Bonum constituent les prochaines étapes.

## Déploiement du frontend

Publier le dossier `dist/` sur un hébergement statique avec fallback SPA vers `index.html`, nécessaire pour ouvrir directement `/catalogue`, `/catalogue/:slug` et `/contact`. Les routes `/api/*` doivent être servies par le backend, sans fallback HTML. Le fichier `public/_redirects` fournit le fallback pour les hébergeurs compatibles.

Alegreya et Manrope sont chargées via Google Fonts ; des polices système prennent le relais hors connexion. Pour une production sans dépendance à Google Fonts, héberger les fichiers WOFF2 incluant le cyrillique et mettre à jour les déclarations de polices.

## GitHub Pages

Un workflow `.github/workflows/deploy-pages.yml` compile et publie `dist/` à chaque push sur `main` (ou manuellement depuis Actions).

1. Dans le dépôt GitHub, ouvrir **Settings → Pages → Build and deployment → Source → GitHub Actions**.
2. Committer et pousser les modifications sur `main`.
3. Attendre la réussite du workflow **Deploy to GitHub Pages**.

URL prévue : https://gregboil.github.io/Meiro_site/

`npm run build:pages` utilise `/Meiro_site/` et le routage par hash, par exemple `/Meiro_site/#/catalogue`. Cela permet les accès directs et le rafraîchissement sans réécriture serveur. Le workflow utilise le chemin fourni par GitHub pour prendre aussi en charge un domaine personnalisé. Le build standard et le développement local conservent les URL habituelles. Les liens de défilement internes ne modifient pas le hash de navigation.

GitHub Pages héberge seulement le frontend. Le formulaire et QPay nécessiteront un backend séparé ; si le formulaire est activé via une URL externe, ce backend doit autoriser l'origine du site avec CORS.
