import { Navigate, Outlet, useParams } from 'react-router-dom';

import { ConnectionsSettings, INTEGRATION_GROUPS } from '../components/ConnectionsSettings';
import { Scrolling } from '../components/Layout';

/** Integrações: each kind of tool the Bots can enter is its own item in the menu on the left. */
export function IntegrationsLayout() {
  return (
    <Scrolling>
      <Outlet />
    </Scrolling>
  );
}

export function IntegrationsPage() {
  const { group } = useParams<{ group?: string }>();
  if (!group || !INTEGRATION_GROUPS.some(item => item.id === group)) {
    return <Navigate replace to="/integrations/models" />;
  }
  return <ConnectionsSettings group={group} />;
}
