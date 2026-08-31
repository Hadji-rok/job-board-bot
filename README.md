# Job Board Bot

A standalone Discord bot for posting paid jobs that role-eligible members can claim,
modeled on a job-board embed with **Claimed** / **Can't Do It** buttons.

## Features

- `/post-job` — post a job with title, kingdom, payment, when, eligible role,
  optional linked ticket, and optional auto-expiry (`2h`, `30m`, `1d`, etc.)
- **Claimed** button — only clickable by members with the eligible role; records
  the claimer and posts a "claimed by" announcement
- **Can't Do It** button — only the claiming pilot can release the job (not
  even admins, via the button); it reopens the job, re-pings the eligible
  role, and reposts the listing to the bottom of the channel so it's easy to
  spot
- `/close-job job_id:<id>` — manually close a listing
- `/force-release job_id:<id> reason:<optional>` — admin-only: drop a job from
  its claimed pilot if they've gone unresponsive or won't make it. The job
  reopens, re-pings the eligible role, and reposts to the bottom of the
  channel — same as if the pilot had released it themselves via **Can't Do
  It**. This is separate from that button, which only the claiming pilot can
  use.
- Background auto-expiry — jobs with an `expires_in` set are automatically marked
  expired and the embed/buttons update

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Fill in:
   - `DISCORD_TOKEN` — your bot's token from the Discord Developer Portal
   - `DISCORD_CLIENT_ID` — your application's client ID
   - `DISCORD_GUILD_ID` — (optional) set this during development for instant
     command registration in one server; leave blank for global commands
   - `DATABASE_URL` — your Postgres connection string

3. **Set up the database**
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

4. **Register slash commands**
   ```bash
   npm run deploy-commands
   ```

5. **Run the bot**
   ```bash
   npm start
   ```

## Ticket system

A second feature: a panel with two dropdowns ("Customer Ticket — hire a
service" and "Support Ticket — get help") where picking an option opens a
private channel for that request, visible only to the opener and a staff
role.

1. **Set the staff role** (who can see every ticket):
   ```
   /ticket-config staff-role role:@Staff
   ```

2. **Add ticket types** — one per dropdown option. Create the categories in
   Discord first if you want a separate category per type, then:
   ```
   /ticket-type add key:war_piloting label:"War Piloting" description:"Human-operated war piloting for your account." group:"Customer Ticket — hire a service" category:#war-piloting-tickets
   /ticket-type add key:farm_care label:"Farm Piloting" description:"Keep your farms active without the daily grind." group:"Customer Ticket — hire a service" category:#farm-care-tickets
   /ticket-type add key:account_management label:"Account Care" description:"Ongoing daily task, event & AoO management." group:"Customer Ticket — hire a service" category:#account-care-tickets
   /ticket-type add key:baulur_pilot label:"Baulur Camp Service" description:"Consistent camp activity and reliable handling." group:"Customer Ticket — hire a service" category:#baulur-tickets
   /ticket-type add key:barb_chaining label:"KVK Chaining" description:"Efficient barbarian chaining to turn AP into Honor." group:"Customer Ticket — hire a service" category:#chaining-tickets

   /ticket-type add key:pilot_application label:"Pilot Application" description:"Apply to become a pilot." group:"Support Ticket — get help" category:#applications
   /ticket-type add key:queries label:"Queries" description:"General questions." group:"Support Ticket — get help" category:#support-tickets
   /ticket-type add key:transaction_support label:"Transaction Support" description:"Help with a payment or transaction." group:"Support Ticket — get help" category:#support-tickets
   ```
   Check what's configured any time with `/ticket-type list`. You can leave
   `category` off and set it later by re-running `add` with the same key.

   **Important:** the five Customer service keys above (`war_piloting`,
   `farm_care`, `account_management`, `baulur_pilot`, `barb_chaining`) must
   match exactly — they're wired to pre-fill forms (see below). Any other
   key you add skips the form and creates the channel immediately.

3. **Post the panel** in whichever channel you want (e.g. a `#open-a-ticket`
   channel):
   ```
   /ticket-panel
   ```

Ticket channels are named `type-username` and include a **Close Ticket**
button (mutes the opener, keeps history visible) and, once closed, a
**Delete Channel** button for staff.

### Pre-fill forms

Picking one of the five Customer services (War Piloting, Farm Care, Account
Management, Baulur Pilot, Barb Chaining) pops up a form modal first —
Discord caps modals at 5 fields, so each one asks the 5 most relevant
questions for that service (e.g. War Piloting asks marches/crystal tech,
dead troops, playstyle, date & duration, and price awareness). The channel
is only created after they submit, and their answers appear as fields on
the welcome embed so staff have context immediately.

Forms live in `src/ticketForms.js`, keyed by the same string used in
`/ticket-type add key:...`. To change the questions for a service, edit
that file. To add a form for a new service, add an entry there with a
matching ticket-type key (max 5 fields, `TextInputStyle.Short` for
one-liners or `TextInputStyle.Paragraph` for longer answers).

## Shift logging

- `/shift start` — clock in
- `/shift end` — clock out, replies with how long you worked
- `/shift status` — check your currently running shift
- `/mystats` — completed shifts, total hours logged, current shift (if any),
  and jobs claimed — all pulled from your own history in this server

Only one active shift per person per server at a time; `/shift start` while
one's already running will tell you to end it first instead of overwriting it.

## Discord bot permissions / intents

In the Developer Portal, enable:
- **Server Members Intent** (required to check role membership on claim and
  ticket panel interactions)

The bot needs these permissions in your server: `Send Messages`, `Embed Links`,
`Use Application Commands`, `Read Message History`, `Manage Channels` (to
create and delete ticket channels).

## Notes

- `/post-job` and `/close-job` default to requiring **Manage Server** permission.
  Adjust `.setDefaultMemberPermissions(...)` in `src/commands/*.js` if you want a
  different role gate, or remove it and rely on Discord's per-command permission
  UI instead.
- Job data lives in Postgres via Prisma (`prisma/schema.prisma`). Run
  `npx prisma studio` to browse job records visually.
