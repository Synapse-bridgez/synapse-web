import { useEffect, useState } from 'react';

export interface Contributor {
  login: string;
  avatar_url: string;
  contributions: number;
}

let contributorsPromise: Promise<Contributor[]> | null = null;
let cachedContributors: Contributor[] | null = null;

function loadContributors(): Promise<Contributor[]> {
  if (!contributorsPromise) {
    contributorsPromise = fetch('/contributors.json')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load contributors: ${res.status}`);
        }
        return res.json();
      })
      .then((data: Contributor[]) => {
        cachedContributors = data;
        return data;
      })
      .catch((error) => {
        contributorsPromise = null;
        if (cachedContributors) {
          return cachedContributors;
        }
        throw error;
      });
  }
  return contributorsPromise;
}

export default function DripsWidget() {
  const [contributors, setContributors] = useState<Contributor[]>(cachedContributors ?? []);
  const [loading, setLoading] = useState(!cachedContributors);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    loadContributors()
      .then((data) => {
        if (!active) return;
        setContributors(data);
        setError(null);
      })
      .catch(() => {
        if (!active) return;
        setError('Unable to load contributors.');
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <div className="drips-widget">Loading contributors…</div>;
  }

  if (error) {
    return <div className="drips-widget">{error}</div>;
  }

  return (
    <div className="drips-widget">
      <h2>Contributors</h2>
      <ul>
        {contributors.map((contributor) => (
          <li key={contributor.login}>
            <img src={contributor.avatar_url} alt={contributor.login} width={24} height={24} />
            <span>{contributor.login}</span>
            <span>{contributor.contributions}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
