import { ConnectionsSettings } from '../components/ConnectionsSettings';
import { Scrolling } from '../components/Layout';

/** Integrações: one page, a sheet per kind of tool, the Models under OpenRouter. */
export function IntegrationsPage() {
  return (
    <Scrolling>
      <ConnectionsSettings />
    </Scrolling>
  );
}
