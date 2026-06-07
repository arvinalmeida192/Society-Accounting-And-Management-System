import { NavLink, useNavigate } from 'react-router-dom';
import { useTabStore } from '../store/tabStore';

const explorerNodes = [
  {
    id: 'society',
    label: 'Society Setup',
    children: [
      { id: 'soc-identity', label: 'Identity', route: '/app/setup/identity' },
      { id: 'soc-params', label: 'Parameters', route: '/app/setup/parameters' },
      { id: 'soc-property', label: 'Property', route: '/app/setup/property' },
      { id: 'soc-formats', label: 'Report Formats', route: '/app/setup/report-formats' },
    ],
  },
  {
    id: 'property',
    label: 'Property',
    children: [{ id: 'bld', label: 'Buildings', route: '/app/property/buildings' }],
  },
  {
    id: 'reports',
    label: 'Reports',
    children: [{ id: 'rpt', label: 'Reports Hub', route: '/app/reports' }],
  },
];

export function ExplorerTree(): React.ReactElement {
  const navigate = useNavigate();
  const openTab = useTabStore((state) => state.openTab);

  return (
    <nav className="explorer-tree" aria-label="Explorer menu">
      <p className="explorer-title">Explorer</p>
      <ul>
        {explorerNodes.map((group) => (
          <li key={group.id}>
            <span className="explorer-group">{group.label}</span>
            <ul>
              {group.children.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="explorer-link"
                    onClick={() => {
                      openTab({ id: item.id, title: item.label, route: item.route });
                      navigate(item.route);
                    }}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <NavLink to="/app/home" className="explorer-home-link">
        Dashboard
      </NavLink>
    </nav>
  );
}
