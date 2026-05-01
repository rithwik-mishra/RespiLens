import { Stack, Title, Text, Button, Group, Paper, SimpleGrid, ThemeIcon, Box } from '@mantine/core';
import { IconChartLine, IconTarget, IconDashboard, IconArrowRight } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { useView } from '../hooks/useView';

const FeatureCard = ({ icon: Icon, title, description, action }) => (
  <Paper shadow="sm" p="xl" radius="md" withBorder style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    <ThemeIcon size="lg" variant="light" radius="md">
      <Icon size={20} />
    </ThemeIcon>
    <Title order={4}>{title}</Title>
    <Text size="sm" c="dimmed" style={{ flexGrow: 1 }}>{description}</Text>
    {action}
  </Paper>
);

const FrontPage = () => {
  const { setViewType } = useView();

  return (
    <Box
      style={{
        minHeight: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <Stack gap="xl" style={{ maxWidth: 860, width: '100%' }}>

        {/* Hero */}
        <Stack gap="sm" align="center" ta="center">
          <Title order={1} size="2.5rem">
            Welcome to{' '}
            <Text span c="blue" inherit>RespiLens</Text>
          </Title>
          <Text size="lg" c="dimmed" maw={560}>
            Explore respiratory disease forecasts and surveillance data from leading public health hubs, all in one place.
          </Text>
          <Button
            size="md"
            mt="sm"
            rightSection={<IconArrowRight size={16} />}
            onClick={() => setViewType('flu_forecasts')}
          >
            Explore Forecasts
          </Button>
        </Stack>

        {/* Feature Cards */}
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          <FeatureCard
            icon={IconChartLine}
            title="Forecasts"
            description="View and compare flu, COVID-19, and RSV forecasts from multiple modeling teams across the US."
            action={
              <Button
                variant="light"
                size="xs"
                rightSection={<IconArrowRight size={14} />}
                onClick={() => setViewType('flu_forecasts')}
              >
                View Forecasts
              </Button>
            }
          />
          <FeatureCard
            icon={IconTarget}
            title="Forecastle"
            description="Test your intuition by predicting how forecasts will perform."
            action={
              <Button
                variant="light"
                size="xs"
                rightSection={<IconArrowRight size={14} />}
                component={Link}
                to="/forecastle"
              >
                Play Forecastle
              </Button>
            }
          />
          <FeatureCard
            icon={IconDashboard}
            title="MyRespiLens"
            description="Track your bookmarks, activity, and personalized forecast views in your own dashboard."
            action={
              <Button
                variant="light"
                size="xs"
                rightSection={<IconArrowRight size={14} />}
                component={Link}
                to="/myrespilens"
              >
                Go to Dashboard
              </Button>
            }
          />
        </SimpleGrid>

        {/* Footer nudge */}
        <Text ta="center" size="sm" c="dimmed">
          Not sure where to start?{' '}
          <Text
            span
            c="blue"
            style={{ cursor: 'pointer' }}
            onClick={() => setViewType('flu_forecasts')}
          >
            Jump into flu forecasts →
          </Text>
        </Text>

      </Stack>
    </Box>
  );
};

export default FrontPage;