import React, { useContext } from 'react';
// @ts-ignore
import { DEFAULT_PORTAL_CONTAINER } from './common/constants';

export type OnSMCmdHandler = (cmd: SMCmdDtls) => void;
export type SMCmdDtls = {
  cmd: SMCmd;
  data: SMCmdParams;
};
export type SMCmd = `SM_${string}_CMD`;

export type SMCmdParams = {
  [key: string]: string | SMCmdParams | SMCmdParams[];
};

type HMSPrebuiltContextType = {
  roomCode: string;
  userName?: string;
  userId?: string;
  containerSelector: string;
  endpoints?: Record<string, string>;
  onLeave?: () => void;
  onJoin?: () => void;
  smAppProps?: {
    chatEnabled: boolean;
    onSMCmd?: OnSMCmdHandler;
  };
};

export const HMSPrebuiltContext = React.createContext<HMSPrebuiltContextType>({
  roomCode: '',
  userName: '',
  userId: '',
  containerSelector: DEFAULT_PORTAL_CONTAINER,
  endpoints: {},
  onLeave: undefined,
  onJoin: undefined,
  smAppProps: { chatEnabled: true, onSMCmd: undefined },
});

HMSPrebuiltContext.displayName = 'HMSPrebuiltContext';

export const useHMSPrebuiltContext = () => {
  const context = useContext(HMSPrebuiltContext);
  if (!context) {
    throw Error('Make sure HMSPrebuiltContext.Provider is present at the top level of your application');
  }
  return context;
};
