import * as React from 'react';
import {
  List,
  Popup,
  ShorthandCollection,
  Text,
  MenuItemProps,
  MenuShorthandKinds,
  IconProps,
  Menu,
  Button,
} from '@fluentui/react-northstar';
import { IRosterItemInternalProps } from './interface/roster.interface';
import { RosterAvatar } from './RosterAvatar';
import { RosterUserName } from './RosterUsername';
import { RosterState } from './RosterState';
import { RosterMessage } from './RosterMessage';
import { rosterListItemStyles, rosterMenuPopupStyles } from './styles/styles';
import { useJitterState } from './hooks/useJitterState';

export const RosterItemInternal: React.FunctionComponent<IRosterItemInternalProps> = ({
  userId,
  visuals,
  displayName,
  actions,
  isMuted,
  type,
}) => {
  const isActive = useJitterState({
    from: 500,
    to: 2000,
    enabled: (type === 'presenters' || type === 'attendees') && !isMuted,
  });
  const { toggleMute, togglePromote } = actions;

  const [isOpen, setOpen] = React.useState(false);
  const [isContextOpen, setContextOpen] = React.useState(false);

  const closeAll = () => {
    setOpen(false);
    setContextOpen(false);
  };

  const items: ShorthandCollection<MenuItemProps, MenuShorthandKinds> = [];
  if (type !== 'suggestions') {
    items.push(
      {
        key: 'mute',
        content: <Text content={isMuted ? 'Unmute' : 'Mute'} />,
        icon: {
          name: isMuted ? 'mic' : 'mic-off',
          outline: true,
          xSpacing: 'after',
        } as IconProps,
        onClick: () => toggleMute(userId, type),
      },
      {
        key: type === 'presenters' ? 'demote' : 'promote',
        content: <Text content={type === 'presenters' ? 'Demote' : 'Promote'} />,
        icon: {
          name: 'presenter',
          outline: true,
          xSpacing: 'after',
        } as IconProps,
        onClick: () => togglePromote(userId, type),
      },
    );
  }

  const menu = <Menu vertical items={items} onItemClick={closeAll} />;

  const actionButton = (
    <Popup
      open={isOpen}
      on="click"
      onOpenChange={(_, { open }) => setOpen(open)}
      position="below"
      align="end"
      trigger={
        <Button
          iconOnly
          text
          onClick={() => (isOpen ? setOpen(false) : setOpen(true))}
          variables={{
            isCallingSidePanelIconOnlyButton: true,
            isCallingRosterPopupButton: true,
          }}
          className="show-only-on-list-item-hover"
          icon="more"
          data-cid="ts-participant-action-button"
        />
      }
      content={{ content: menu, variables: rosterMenuPopupStyles }}
    />
  );
  return (
    <Popup
      open={isContextOpen}
      on="context"
      onOpenChange={(_, { open }) => setContextOpen(open)}
      trigger={
        <div>
          <List.Item
            truncateHeader
            key={userId}
            media={<RosterAvatar isActive={isActive} visuals={visuals} />}
            header={<RosterUserName isActive={isActive} displayName={displayName} />}
            endMedia={<RosterState action={actionButton} isMuted={isMuted} />}
            content={<RosterMessage />}
            styles={rosterListItemStyles}
          />
        </div>
      }
      content={{ content: menu, variables: rosterMenuPopupStyles }}
    />
  );
};
