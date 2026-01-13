/**
 * Requirements addressed:
 * - Provide a Share page in a separate window (manual + nag).
 * - Share buttons open X/LinkedIn share flows for the repo with a message.
 * - In nag mode, show "Later!" and "Stop Nagging Me!" controls.
 * - Closing the window via X is treated as "Later" (best-effort; main handles close).
 * - Do not display scheme/target inline in the interstitial (use for share text only).
 */
import { Alert, Button, Group, Loader, Stack, Text } from '@mantine/core';
import { IconBrandLinkedin, IconBrandX, IconShare2 } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import GitHubButton from 'react-github-btn';

import { getWinLinkRouterApi } from '../api/winLinkRouterApi';

interface ShareContext {
  mode: 'manual' | 'nag';
  scheme: string;
  templateLabel: string;
}

export function ShareWindow() {
  const api = getWinLinkRouterApi();

  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<ShareContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!api) return;
    let cancelled = false;
    setLoading(true);
    void api.share
      .getContext()
      .then((res) => {
        if (cancelled) return;
        setContext(res.context as ShareContext | null);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError((err as Error).message);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  if (!api) {
    return (
      <Stack gap="sm" p="md">
        <Alert color="red" title="Preload API unavailable">
          Missing preload API (window.winLinkRouter). Ensure the Electron
          preload script is configured and contextIsolation is enabled.
        </Alert>
      </Stack>
    );
  }

  const isNag = context?.mode === 'nag';

  return (
    <Stack gap="md" p="md" style={{ height: '100%' }}>
      {loading ? (
        <Group gap="xs">
          <Loader size="sm" />
          <Text size="sm" c="dimmed">
            Loading…
          </Text>
        </Group>
      ) : null}

      {error ? (
        <Alert color="red" title="Error">
          {error}
        </Alert>
      ) : null}

      <Stack gap="xs">
        <Text fw={600}>Like win-link-router? Tell your friends!</Text>

        <Group gap="sm" wrap="wrap">
          <Button
            leftSection={<IconBrandX size={16} />}
            onClick={() => {
              setBusy(true);
              void api.share
                .shareX()
                .catch((err: unknown) => {
                  setError((err as Error).message);
                })
                .finally(() => {
                  setBusy(false);
                });
            }}
            disabled={busy || loading}
          >
            Share on X
          </Button>

          <Button
            leftSection={<IconBrandLinkedin size={16} />}
            onClick={() => {
              setBusy(true);
              void api.share
                .shareLinkedIn()
                .catch((err: unknown) => {
                  setError((err as Error).message);
                })
                .finally(() => {
                  setBusy(false);
                });
            }}
            disabled={busy || loading}
          >
            Share on LinkedIn
          </Button>
        </Group>
      </Stack>

      <Stack gap="xs">
        <Text fw={600}>Give us a star on GitHub!</Text>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <GitHubButton
            href="https://github.com/karmaniverous/win-link-router"
            data-color-scheme="no-preference: light; light: light; dark: dark;"
            data-size="large"
            data-show-count="true"
            aria-label="Star karmaniverous/win-link-router on GitHub"
          >
            Star
          </GitHubButton>
        </div>
      </Stack>

      {isNag ? (
        <Stack gap="sm" style={{ marginTop: 'auto' }}>
          <Group justify="flex-end" gap="sm" wrap="wrap">
            <Button
              variant="default"
              leftSection={<IconShare2 size={16} />}
              onClick={() => {
                setBusy(true);
                void api.share
                  .later()
                  .catch((err: unknown) => {
                    setError((err as Error).message);
                  })
                  .finally(() => {
                    setBusy(false);
                  });
              }}
              disabled={busy || loading}
            >
              Later!
            </Button>
            <Button
              color="red"
              variant="default"
              onClick={() => {
                setBusy(true);
                void api.share
                  .stopNagging()
                  .catch((err: unknown) => {
                    setError((err as Error).message);
                  })
                  .finally(() => {
                    setBusy(false);
                  });
              }}
              disabled={busy || loading}
            >
              Stop Nagging Me!
            </Button>
          </Group>
        </Stack>
      ) : null}
    </Stack>
  );
}
