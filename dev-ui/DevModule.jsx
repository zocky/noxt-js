import yaml from 'js-yaml';


export const route = '/module/:name';
export const params = {
  module: ({ name }, { noxt }) => noxt.modules[name],
  Template: ({ name }, { noxt }) => noxt.components[name]
};

export default async function DevModule({ name, Template }, { query, req, res }) {
  if (!Template) return <p>No component named “{name}”.</p>;
  return (
    <div>
      <h1>Dev UI - {name}</h1>
      {await Template.renderWithRequest(query, req, res, query = {})}
      <Node node={await Template.evaluateWithRequest(query, req, res, query = {})} />
    </div>
  );
}

function Node({ node }) {
  if (!node) return null;
  if (typeof node === 'string' || typeof node === 'number') return node;

  if (Array.isArray(node)) {
    return (
      <div>
        {node.map((n) => (
          <Node node={n} />
        ))}
      </div>
    );
  }
  if (typeof node === 'boolean') return node;
  if (typeof node === 'object') {
    if (node.html) return <pre>{node.html.slice(0, 100)}</pre>
  }

  const { type, props: { children, ...props } = {} } = node;
  let kind = 'tag';

  if (type?.isNoxtFragment) {
    return (
      <noxt-node type="fragment">
        {children && <noxt-children><Node node={children} /></noxt-children>}
      </noxt-node>
    )
  }
  let name = type;

  if (type?.isNoxtComponent) {
    kind = 'component';
    name = type.noxtName;
  } else if (typeof type === 'function') {
    kind = 'function';
    name = type.constructor.name + ' ' + (type.name || 'anon');
  } else {
    name = type;
  }
  return (
    <noxt-node type={kind}>
      <noxt-name>{name}</noxt-name>
      <noxt-props>
        {Object.entries(props).map(([k, v]) => {
          const value = safeStringify(v);
          const text = value.length > 30 ? <details ><summary>{value.slice(0, 27) + '...'}</summary><pre>{yaml.dump(v)}</pre></details> : value;
          return <noxt-prop>
            <noxt-key>{k}</noxt-key>
            <noxt-value>{text}</noxt-value>
          </noxt-prop>
        })}
      </noxt-props>
      {children && <noxt-children><Node node={children} /></noxt-children>}
    </noxt-node>
  );
}

function safeStringify(value, space = 0) {
  return JSON.stringify(value, (k, v) => {
    if (v == null) return v; // use null, drop undefined
    const t = typeof v;
    if (t === 'boolean' || t === 'string' || t === 'number') return v;
    if (Array.isArray(v)) return v;
    if (t === 'object' && (v.constructor === Object || v.constructor === null)) return v;
    return '[' + t + ' ' + v.constructor.name + ']';
  }, space);
}