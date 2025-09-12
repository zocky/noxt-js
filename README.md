# noxt-js

A zero-config JSX web server powered by [Express](https://expressjs.com/) and [noxt-js-middleware](https://npmjs.com/package/noxt-js-middleware).  
Run it with `npx noxt-js` and drop `.jsx` files into your `views/` folder — routes are created automatically.  

No React required. No heavy framework. Just JSX + Express.  

---

## Installation

```sh
npm install noxt-js
```

or run it directly without installing:

```sh
npx noxt-js
```

---

## Quick Start

```sh
npx noxt-js
```

By default, this will:

- Serve pages from `./views/`
- Start an HTTP server on port `3000`
- Look for configuration in `noxt.config.yaml` (optional)

---

## Configuration

`noxt-js` reads options from `noxt.config.yaml` in your project root, or from CLI flags.  
CLI flags override config file values.

Example `noxt.config.yaml`:

```yaml
port: 4000
host: localhost
views: views
logLevel: info
ssl: false
```

Run with CLI overrides:

```sh
npx noxt-js --port 8080 --views src/pages
```

### Available options

- **`port`**: HTTP port number (default: `3000`)  
- **`host`**: Hostname or IP (default: `0.0.0.0`)  
- **`views`**: Directory containing `.jsx` files (default: `views`)  
- **`logLevel`**: One of `error`, `warn`, `info`, `debug`  
- **`ssl`**:  
  - `false` (disable SSL)  
  - or object with `cert` and `key` paths for HTTPS  

---

## Context

You can provide shared helpers/utilities to all components via a `context.js` file (or any path you specify in config). For example:

```js
// context.js
export async function fetchUser(id) {
  return db.users.findById(id);
}
```

Then in a page:

```jsx
export const route = '/user/:id';

export default async function UserPage({ id }, { fetchUser }) {
  const user = await fetchUser(id);
  return <h1>{user.name}</h1>;
}
```

---

## Pages & Routing

- Any `.jsx` file in `views/` is loaded as a component.  
- If it exports `route`, it becomes a page at that route.  
- Props come from route params, query string, and optional `params` export.  

Example:

```jsx
export const route = '/hello/:name';

export default function HelloPage({ name }) {
  return <h1>Hello, {name}!</h1>;
}
```

---


---

## License

MIT © 2025 [Your Name]  
