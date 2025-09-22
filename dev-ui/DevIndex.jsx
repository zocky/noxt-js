export const route = '/';

export default function DevIndex({ }, { noxt, DevModule }) {
  const { modules, components } = noxt;
  return (
    <div>
      <h1>Dev UI</h1>
      <ul class="noxt list">
        {Object.keys(modules).map((name) => (
          <div class="nost item">
            {name}: <DevModule.Link name={name} text={name} />
          </div>
        ))}
      </ul>
    </div>
  );
}