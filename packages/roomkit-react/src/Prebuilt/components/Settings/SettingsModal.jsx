import React, { Fragment, useCallback, useEffect, useState } from 'react';
import { useMedia } from 'react-use';
import { selectLocalPeerRoleName, useHMSStore } from '@100mslive/react-sdk';
import { ChevronLeftIcon, CrossIcon } from '@100mslive/react-icons';
import { Box, config as cssConfig, Flex, IconButton, Tabs, Text } from '../../../';
import { BottomActionSheet } from '../BottomActionSheet/BottomActionSheet';
import { useHLSViewerRole } from '../AppData/useUISettings';
import { settingContent, settingsList } from './common.js';

const SettingsModal = ({ open, onOpenChange, children }) => {
  const mediaQueryLg = cssConfig.media.md;
  const isMobile = useMedia(mediaQueryLg);

  const hlsViewerRole = useHLSViewerRole();
  const localPeerRole = useHMSStore(selectLocalPeerRoleName);
  const isHlsViewer = hlsViewerRole === localPeerRole;

  const [showSetting, setShowSetting] = useState(() =>
    settingsList.reduce((obj, { tabName }) => ({ ...obj, [tabName]: true }), {}),
  );

  const hideSettingByTabName = useCallback(
    key => hide => setShowSetting(prev => ({ ...prev, [key]: !hide })),
    [setShowSetting],
  );

  useEffect(() => {
    if (isHlsViewer) {
      hideSettingByTabName('layout')(true);
    }
  }, [isHlsViewer, hideSettingByTabName]);

  const [selection, setSelection] = useState(() => Object.keys(showSetting).find(key => showSetting[key]) ?? '');
  const resetSelection = useCallback(() => {
    setSelection('');
  }, []);

  useEffect(() => {
    if (isMobile) {
      setSelection('');
    } else {
      const firstNotHiddenTabName = Object.keys(showSetting).find(key => showSetting[key]) ?? '';
      setSelection(firstNotHiddenTabName);
    }
  }, [isMobile, showSetting]);
  console.log('here sheet open ', open);
  return (
    <>
      <Tabs.Root
        value={selection}
        activationMode={isMobile ? 'manual' : 'automatic'}
        onValueChange={setSelection}
        css={{ size: '100%', position: 'relative' }}
      >
        <Tabs.List
          css={{
            w: isMobile ? '100%' : '18.625rem',
            flexDirection: 'column',
            bg: '$background_default',
            p: '$14 $10',
            borderTopLeftRadius: '$4',
            borderBottomLeftRadius: '$4',
          }}
        >
          <Text variant="h5">Settings </Text>
          <Flex direction="column" css={{ mx: isMobile ? '-$8' : 0, overflowY: 'auto', pt: '$10' }}>
            {settingsList
              .filter(({ tabName }) => showSetting[tabName])
              .map(({ icon: Icon, tabName, title }) => {
                return (
                  <Tabs.Trigger key={tabName} value={tabName} css={{ gap: '$8' }}>
                    <Icon />
                    {title}
                  </Tabs.Trigger>
                );
              })}
          </Flex>
        </Tabs.List>
        {selection && (
          <Flex
            direction="column"
            css={{
              flex: '1 1 0',
              minWidth: 0,
              mr: '$4',
              ...(isMobile
                ? {
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bg: '$surface_default',
                    width: '100%',
                    height: '100%',
                  }
                : {}),
            }}
          >
            {settingsList
              .filter(({ tabName }) => showSetting[tabName])
              .map(({ content: Content, title, tabName }) => {
                return (
                  <Tabs.Content key={tabName} value={tabName} className={settingContent()}>
                    <SettingsContentHeader onBack={resetSelection} isMobile={isMobile}>
                      {title}
                    </SettingsContentHeader>
                    <Content setHide={hideSettingByTabName(tabName)} />
                  </Tabs.Content>
                );
              })}
          </Flex>
        )}
      </Tabs.Root>
    </>
  );
};

const SettingsContentHeader = ({ children, isMobile, onBack }) => {
  return (
    <Text variant="h6" css={{ mb: '$12', display: 'flex', alignItems: 'center' }}>
      {isMobile && (
        <Box as="span" css={{ bg: '$surface_bright', mr: '$4', r: '$round', p: '$2' }} onClick={onBack}>
          <ChevronLeftIcon />
        </Box>
      )}
      {children}
    </Text>
  );
};

export default SettingsModal;
