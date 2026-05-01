"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Code,
  Container,
  Divider,
  Group,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconDatabase,
  IconExternalLink,
  IconLayoutDashboard,
  IconMoon,
  IconRefresh,
  IconSend,
  IconSun,
} from "@tabler/icons-react";

type HealthResponse = {
  ok: boolean;
  airtable: {
    configured: boolean;
    baseId: boolean;
    tableName: boolean;
    apiKey: boolean;
  };
};

type AccountRecord = {
  id: string;
  name: string;
  createdTime?: string;
};

const debitAccountField = "счёт списания линк"; // !!s587s-trs-field!!
const creditAccountField = "счёт назначения линк"; // !!s587s-trn-field!!
const dateField = "дата"; // !!s587s-trd-field!!
const debitSumField = "сумма списания"; // !!s587s-trssum-field!!
const creditSumField = "сумма назначения"; // !!s587s-trzsum-field!! (not "сумма зачисления")
const commentField = "комментарий"; // !!s587s-trcom-field!!
const recentDebitAccountsKey = "s587s.recentDebitAccounts";
const recentCreditAccountsKey = "s587s.recentCreditAccounts";

function readRecentAccounts(key: string) {
  try {
    const value = window.localStorage.getItem(key);
    if (!value) return [];
    const parsed = JSON.parse(value) as AccountRecord[];

    return parsed.filter((account) => account.id && account.name).slice(0, 3);
  } catch {
    return [];
  }
}

function nextRecentAccounts(accounts: AccountRecord[], selectedAccount: AccountRecord) {
  return [
    selectedAccount,
    ...accounts.filter((account) => account.id !== selectedAccount.id),
  ].slice(0, 3);
}

export default function Home() {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [debitAccountId, setDebitAccountId] = useState<string | null>(null);
  const [creditAccountId, setCreditAccountId] = useState<string | null>(null);
  const [recentDebitAccounts, setRecentDebitAccounts] = useState<AccountRecord[]>([]);
  const [recentCreditAccounts, setRecentCreditAccounts] = useState<AccountRecord[]>([]);
  const [recordDate, setRecordDate] = useState<string>("");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Set default date only on client to avoid hydration mismatch
  useEffect(() => {
    if (isClient && !recordDate) {
      setRecordDate(new Date().toISOString().split("T")[0]);
    }
  }, [isClient]);
  
  const [debitSum, setDebitSum] = useState<string | number>("");
  const [creditSum, setCreditSum] = useState<string | number>("");
  const [comment, setComment] = useState("");

  const isConfigured = health?.airtable.configured === true;
  const isDark = computedColorScheme === "dark";

  const accountOptions = useMemo(
    () => accounts.map((account) => ({ value: account.id, label: account.name })),
    [accounts],
  );

  const refreshAccounts = useCallback(async () => {
    setAccountsLoading(true);

    try {
      const response = await fetch("/api/airtable/accounts", { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Не удалось прочитать счета");
      }

      setAccounts(payload.accounts ?? []);
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Ошибка списка счетов",
        message: error instanceof Error ? error.message : "Неизвестная ошибка",
      });
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      const healthResponse = await fetch("/api/health", { cache: "no-store" });
      const nextHealth = (await healthResponse.json()) as HealthResponse;
      setHealth(nextHealth);

      if (nextHealth.airtable.configured) {
        await refreshAccounts();
      } else {
        setAccounts([]);
      }
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Ошибка подключения",
        message: error instanceof Error ? error.message : "Неизвестная ошибка",
      });
    } finally {
      setLoading(false);
    }
  }, [refreshAccounts]);

  function selectDebitAccount(accountId: string | null) {
    setDebitAccountId(accountId);

    const account = accounts.find((item) => item.id === accountId);
    if (!account) return;

    setRecentDebitAccounts((currentAccounts) => {
      const nextAccounts = nextRecentAccounts(currentAccounts, account);
      window.localStorage.setItem(recentDebitAccountsKey, JSON.stringify(nextAccounts));
      return nextAccounts;
    });
  }

  function selectCreditAccount(accountId: string | null) {
    setCreditAccountId(accountId);

    const account = accounts.find((item) => item.id === accountId);
    if (!account) return;

    setRecentCreditAccounts((currentAccounts) => {
      const nextAccounts = nextRecentAccounts(currentAccounts, account);
      window.localStorage.setItem(recentCreditAccountsKey, JSON.stringify(nextAccounts));
      return nextAccounts;
    });
  }

  async function createRecord() {
    if (!debitAccountId && !creditAccountId) {
      notifications.show({
        color: "yellow",
        title: "Выберите счёт",
        message: "Нужно выбрать счёт списания или счёт зачисления.",
      });
      return;
    }

    setLoading(true);

    try {
      const fields: Record<string, unknown> = {};

      if (debitAccountId) fields[debitAccountField] = [debitAccountId];
      if (creditAccountId) fields[creditAccountField] = [creditAccountId];
      if (recordDate) fields[dateField] = recordDate;
      if (debitSum !== "") fields[debitSumField] = Number(debitSum);
      if (creditSum !== "") fields[creditSumField] = Number(creditSum);
      if (comment) fields[commentField] = comment;

      const response = await fetch("/api/airtable/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Не удалось создать запись");
      }

      notifications.show({
        color: "teal",
        title: "Запись создана",
        message: payload.record.id,
      });
      await refresh();
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Ошибка записи",
        message: error instanceof Error ? error.message : "Неизвестная ошибка",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setRecentDebitAccounts(readRecentAccounts(recentDebitAccountsKey));
      setRecentCreditAccounts(readRecentAccounts(recentCreditAccountsKey));
      refresh();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [refresh]);

  return (
    <Box component="main" bg="var(--mantine-color-body)" py={{ base: 24, sm: 40 }} suppressHydrationWarning>
      <Container size="lg">
        <Stack gap="lg">
          <Group justify="space-between" align="flex-start">
            <Stack gap={6}>
              <Group gap="sm">
                <IconDatabase size={30} stroke={1.8} />
                <Title order={1}>s587s</Title>
              </Group>
              <Text c="dimmed" maw={640}>
                Тонкий клиент на Next.js и Mantine для чтения и записи данных в Airtable.
              </Text>
            </Stack>

              <Group gap="xs" suppressHydrationWarning>
                {isClient ? (
                  <Tooltip label={isDark ? "Светлая тема" : "Тёмная тема"}>
                    <ActionIcon
                      aria-label={isDark ? "Включить светлую тему" : "Включить тёмную тему"}
                      size="lg"
                      variant="light"
                      color={isDark ? "yellow" : "blue"}
                      onClick={() => setColorScheme(isDark ? "light" : "dark")}
                    >
                      {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
                    </ActionIcon>
                  </Tooltip>
                ) : (
                  <div style={{ width: 42, height: 42 }} />
                )}
              <Button
                leftSection={<IconRefresh size={18} />}
                variant="light"
                loading={loading}
                onClick={refresh}
              >
                Обновить
              </Button>
            </Group>
          </Group>

          {!isConfigured ? (
            <Paper withBorder radius="md" p="lg">
              <Stack gap="sm">
                <Title order={2}>Настройка окружения</Title>
                <Text c="dimmed">
                  Создайте <Code>.env.local</Code> и заполните значения из{" "}
                  <Code>.env.example</Code>.
                </Text>
                <Divider />
                <SimpleGrid cols={{ base: 1, sm: 3 }}>
                  <Badge color={health?.airtable.apiKey ? "teal" : "gray"} variant="light">
                    AIRTABLE_API_KEY
                  </Badge>
                  <Badge color={health?.airtable.baseId ? "teal" : "gray"} variant="light">
                    AIRTABLE_BASE_ID
                  </Badge>
                  <Badge color={health?.airtable.tableName ? "teal" : "gray"} variant="light">
                    AIRTABLE_TABLE_NAME
                  </Badge>
                </SimpleGrid>
              </Stack>
            </Paper>
          ) : (
            <Paper withBorder radius="md" p="lg">
              <Stack gap="md">
                <Group justify="space-between">
                  <Title order={2}>Новая запись</Title>
                  <Badge variant="light" color="teal">
                    server write
                  </Badge>
                </Group>
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <Stack gap="xs">
                    <Select
                      clearable
                      searchable
                      data={accountOptions}
                      label="Счёт списания"
                      nothingFoundMessage="Ничего не найдено"
                      placeholder="Начните вводить название"
                      value={debitAccountId}
                      onChange={selectDebitAccount}
                      disabled={accountsLoading}
                    />
                    <Group gap="xs">
                      {recentDebitAccounts.map((account) => (
                        <Button
                          key={account.id}
                          size="compact-sm"
                          variant={debitAccountId === account.id ? "light" : "subtle"}
                          onClick={() => selectDebitAccount(account.id)}
                        >
                          {account.name}
                        </Button>
                      ))}
                    </Group>
                  </Stack>
                  <Stack gap="xs">
                    <Select
                      clearable
                      searchable
                      data={accountOptions}
                      label="Счёт зачисления"
                      nothingFoundMessage="Ничего не найдено"
                      placeholder="Начните вводить название"
                      value={creditAccountId}
                      onChange={selectCreditAccount}
                      disabled={accountsLoading}
                    />
                    <Group gap="xs">
                      {recentCreditAccounts.map((account) => (
                        <Button
                          key={account.id}
                          size="compact-sm"
                          variant={creditAccountId === account.id ? "light" : "subtle"}
                          onClick={() => selectCreditAccount(account.id)}
                        >
                          {account.name}
                        </Button>
                      ))}
                    </Group>
                  </Stack>
                </SimpleGrid>
                <Stack gap="md">
                  <SimpleGrid cols={{ base: 1, sm: 2 }}>
                    <TextInput
                      label="Дата"
                      placeholder="Выберите дату"
                      type="date"
                      value={recordDate}
                      onChange={(e) => setRecordDate(e.currentTarget.value)}
                    />
                    <Box />
                  </SimpleGrid>
                  <SimpleGrid cols={{ base: 1, sm: 2 }}>
                    <NumberInput
                      label="Сумма списания"
                      placeholder="0"
                      value={debitSum}
                      onChange={setDebitSum}
                      min={0}
                      step={0.01}
                    />
                    <NumberInput
                      label="Сумма зачисления"
                      placeholder="0"
                      value={creditSum}
                      onChange={setCreditSum}
                      min={0}
                      step={0.01}
                    />
                  </SimpleGrid>
                  <Textarea
                    label="Комментарий"
                    placeholder="Введите комментарий"
                    value={comment}
                    onChange={(e) => setComment(e.currentTarget.value)}
                  />
                </Stack>
                <Group justify="flex-end">
                  <Button
                    leftSection={<IconSend size={18} />}
                    loading={loading}
                    onClick={createRecord}
                  >
                    Создать
                  </Button>
                </Group>
              </Stack>
            </Paper>
          )}

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            <Paper withBorder radius="md" p="md">
              <Stack gap="xs">
                <Text fw={600}>Счета</Text>
                <Button
                  component={Link}
                  href="/accounts"
                  leftSection={<IconExternalLink size={18} />}
                  variant="light"
                  w="fit-content"
                >
                  Открыть
                </Button>
                <Text size="sm" c="dimmed">
                  CRUD по полю name в таблице категорий.
                </Text>
              </Stack>
            </Paper>

            <Paper withBorder radius="md" p="md">
              <Stack gap="xs">
                <Text fw={600}>Дашборд</Text>
                <Button
                  component={Link}
                  href="/dashboard"
                  leftSection={<IconLayoutDashboard size={18} />}
                  variant="light"
                  w="fit-content"
                >
                  Открыть
                </Button>
                <Text size="sm" c="dimmed">
                  Статус Airtable, API и последние записи.
                </Text>
              </Stack>
            </Paper>
          </SimpleGrid>

        </Stack>
      </Container>
    </Box>
  );
}
