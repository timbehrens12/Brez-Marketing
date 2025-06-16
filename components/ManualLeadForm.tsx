'use client';

import { useState } from 'react';
import { useForm } from '@mantine/form';
import {
  TextInput,
  Tabs,
  Button,
  Paper,
  Group,
  Title,
  Text,
  Box,
  Grid,
  Stack,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useAuthenticatedSupabase } from '@/lib/supabase';

interface LeadFormData {
  business_name: string;
  owner_name: string;
  location: string;
  phone: string;
  email: string;
  website: string;
  facebook: string;
  instagram: string;
  twitter: string;
  linkedin: string;
  tiktok: string;
  youtube: string;
}

interface ManualLeadFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ManualLeadForm({ onSuccess, onCancel }: ManualLeadFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { getSupabaseClient } = useAuthenticatedSupabase();

  const form = useForm<LeadFormData>({
    initialValues: {
      business_name: '',
      owner_name: '',
      location: '',
      phone: '',
      email: '',
      website: '',
      facebook: '',
      instagram: '',
      twitter: '',
      linkedin: '',
      tiktok: '',
      youtube: '',
    },
    validate: {
      business_name: (value) => (!value ? 'Business name is required' : null),
      owner_name: (value) => (!value ? 'Owner name is required' : null),
      location: (value) => (!value ? 'Location is required' : null),
      email: (value) => {
        if (!value) return null;
        return /^\S+@\S+$/.test(value) ? null : 'Invalid email address';
      },
      website: (value) => {
        if (!value) return null;
        try {
          new URL(value.startsWith('http') ? value : `https://${value}`);
          return null;
        } catch {
          return 'Invalid website URL';
        }
      },
    },
  });

  // Helper function to clean social media handles
  const cleanSocialHandle = (url: string, platform: string): string => {
    if (!url) return '';
    
    let handle = url.trim();
    
    // Remove protocol and common prefixes
    handle = handle.replace(/^https?:\/\//i, '');
    handle = handle.replace(/^www\./i, '');
    
    // Platform-specific cleaning
    const platformDomains: { [key: string]: string[] } = {
      facebook: ['facebook.com/', 'fb.com/', 'm.facebook.com/'],
      instagram: ['instagram.com/', 'instagr.am/'],
      twitter: ['twitter.com/', 'x.com/'],
      linkedin: ['linkedin.com/in/', 'linkedin.com/company/', 'linkedin.com/pub/'],
      tiktok: ['tiktok.com/@', 'tiktok.com/'],
      youtube: ['youtube.com/channel/', 'youtube.com/user/', 'youtube.com/c/', 'youtu.be/']
    };
    
    if (platformDomains[platform]) {
      for (const domain of platformDomains[platform]) {
        if (handle.toLowerCase().startsWith(domain)) {
          handle = handle.substring(domain.length);
          break;
        }
      }
    }
    
    // Remove @ symbol if it's the first character
    if (handle.startsWith('@')) {
      handle = handle.substring(1);
    }
    
    // Remove trailing slashes and query parameters
    handle = handle.replace(/[\/\?#].*$/, '');
    
    return handle;
  };

  const handleSubmit = async (values: LeadFormData) => {
    try {
      setIsSubmitting(true);
      const supabase = await getSupabaseClient();
      
      // Clean social media handles
      const cleanedData = {
        ...values,
        facebook: cleanSocialHandle(values.facebook, 'facebook'),
        instagram: cleanSocialHandle(values.instagram, 'instagram'),
        twitter: cleanSocialHandle(values.twitter, 'twitter'),
        linkedin: cleanSocialHandle(values.linkedin, 'linkedin'),
        tiktok: cleanSocialHandle(values.tiktok, 'tiktok'),
        youtube: cleanSocialHandle(values.youtube, 'youtube'),
      };

      const { error } = await supabase
        .from('leads')
        .insert([{
          ...cleanedData,
          created_at: new Date().toISOString(),
          source: 'manual'
        }]);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      notifications.show({
        title: 'Success!',
        message: 'Lead saved successfully',
        color: 'green',
      });

      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error('Error saving lead:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to save lead',
        color: 'red',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Paper p="xl" radius="md" withBorder>
      <Stack spacing="lg">
        <div>
          <Title order={2} size="h3" mb="xs">
            Add Lead Manually
          </Title>
          <Text c="dimmed">
            Enter lead information using the form below
          </Text>
        </div>

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Tabs defaultValue="basic" keepMounted={false}>
            <Tabs.List>
              <Tabs.Tab value="basic">Basic Info</Tabs.Tab>
              <Tabs.Tab value="contact">Contact</Tabs.Tab>
              <Tabs.Tab value="social">Social Media</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="basic" pt="lg">
              <Grid>
                <Grid.Col span={6}>
                  <TextInput
                    label="Business Name"
                    placeholder="Enter business name"
                    required
                    {...form.getInputProps('business_name')}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <TextInput
                    label="Owner Name"
                    placeholder="Enter owner name"
                    required
                    {...form.getInputProps('owner_name')}
                  />
                </Grid.Col>
                <Grid.Col span={12}>
                  <TextInput
                    label="Location"
                    placeholder="Enter business location (city, state/province)"
                    required
                    {...form.getInputProps('location')}
                  />
                </Grid.Col>
              </Grid>
            </Tabs.Panel>

            <Tabs.Panel value="contact" pt="lg">
              <Grid>
                <Grid.Col span={6}>
                  <TextInput
                    label="Phone"
                    placeholder="Enter phone number"
                    {...form.getInputProps('phone')}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <TextInput
                    label="Email"
                    placeholder="Enter email address"
                    type="email"
                    {...form.getInputProps('email')}
                  />
                </Grid.Col>
                <Grid.Col span={12}>
                  <TextInput
                    label="Website"
                    placeholder="Enter website URL"
                    {...form.getInputProps('website')}
                  />
                </Grid.Col>
              </Grid>
            </Tabs.Panel>

            <Tabs.Panel value="social" pt="lg">
              <Grid>
                <Grid.Col span={6}>
                  <TextInput
                    label="Facebook"
                    placeholder="Facebook URL or handle"
                    {...form.getInputProps('facebook')}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <TextInput
                    label="Instagram"
                    placeholder="Instagram URL or handle"
                    {...form.getInputProps('instagram')}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <TextInput
                    label="Twitter/X"
                    placeholder="Twitter/X URL or handle"
                    {...form.getInputProps('twitter')}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <TextInput
                    label="LinkedIn"
                    placeholder="LinkedIn URL"
                    {...form.getInputProps('linkedin')}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <TextInput
                    label="TikTok"
                    placeholder="TikTok URL or handle"
                    {...form.getInputProps('tiktok')}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <TextInput
                    label="YouTube"
                    placeholder="YouTube channel URL"
                    {...form.getInputProps('youtube')}
                  />
                </Grid.Col>
              </Grid>
            </Tabs.Panel>
          </Tabs>

          <Group position="right" mt="xl">
            {onCancel && (
              <Button variant="light" onClick={onCancel} disabled={isSubmitting}>
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              loading={isSubmitting}
              disabled={!form.isValid()}
            >
              Save Lead
            </Button>
          </Group>
        </form>
      </Stack>
    </Paper>
  );
} 