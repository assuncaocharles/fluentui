import * as React from 'react';
import { List, Checkbox, Text, Flex, Icon } from '@fluentui/react-northstar';
import { useJitterState } from './hooks/useJitterState';
import { withRosterActions } from './helpers/withRosterActions';
import { RosterSectionType, RosterVisuals } from './interface/roster.interface';
import withCustomComponent from './helpers/withCustomComponent';

export interface IRosterItemProps {
  userId: string;
  displayName: string;
  visuals: RosterVisuals;
  type: RosterSectionType;
  isMuted: boolean;
  message: string;
  selectable: boolean;
  selected: boolean;
  selectIndicator: any;
  id: string;
}

export interface IRosterItemInternalProps extends IRosterItemProps {
  action: React.ReactNode;
}

const RosterItemCustom: React.FunctionComponent<IRosterItemInternalProps> = ({
  isMuted,
  visuals,
  displayName,
  action,
  type,
  selectable,
  message,
  userId,
  selected,
  ...props
}) => {
  const isActive = useJitterState({
    from: 500,
    to: 2000,
    enabled: (type === 'presenters' || type === 'attendees') && !isMuted,
  });

  return (
    <List.Item
      media={<Checkbox data-is-focusable={false} aria-label={displayName} checked={selected} />}
      header={<Text weight={isActive ? 'semibold' : 'regular'}>{displayName}</Text>}
      endMedia={
        <Flex vAlign="center">
          <Flex>{isMuted ? <Icon outline name="mic-off" xSpacing="both" /> : null}</Flex>
          {action}
        </Flex>
      }
      content={<Text content={message} />}
      key={userId}
      truncateHeader
      truncateContent
      selectable
      selected={selected}
      data-is-focusable={false}
      {...props}
    />
  );
};

const RosterItemWithActions = withRosterActions(RosterItemCustom);

export default withCustomComponent(RosterItemWithActions, [
  'isMuted',
  'visuals',
  'displayName',
  'action',
  'type',
  'selectable',
  'message',
  'userId',
  'selected',
]);
