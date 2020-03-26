import * as React from 'react';
import { Tree, Flex } from '@fluentui/react-northstar';
import { RosterItemInternal } from './RosterItem';
import { IActionsContext } from './interface/roster.interface';
import { initialRosterData } from './data/initialRosterData';
import { RosterSectionTitle } from './RosterTitle';
import { useRosterActions } from './hooks/useRosterActions';
import { rosterStyles, rosterTreeStyles } from './styles/styles';

const components = {
  header(Component, { open, content, ...restProps }) {
    return (
      <Component {...restProps}>
        <RosterSectionTitle open={open} type={content} />
      </Component>
    );
  },
  item(_, { type, userId, displayName, visuals, isMuted, actions }) {
    return (
      <RosterItemInternal
        id={userId}
        key={userId}
        userId={userId}
        displayName={displayName}
        visuals={visuals}
        type={type}
        actions={actions}
        isMuted={isMuted}
      />
    );
  },
};

const titleRenderer = (actions: IActionsContext) => (Component, props) => {
  const componentType = props.hasSubtree ? 'header' : 'item';
  return components[componentType](Component, { ...props, actions });
};

export const Roster: React.FunctionComponent<{}> = () => {
  const [rosterData, setRosterData] = React.useState(initialRosterData);
  const actions = useRosterActions(rosterData, setRosterData);
  return (
    <Flex styles={rosterStyles}>
      <Tree as="div" items={rosterData} styles={rosterTreeStyles} renderItemTitle={titleRenderer(actions)} />
    </Flex>
  );
};
