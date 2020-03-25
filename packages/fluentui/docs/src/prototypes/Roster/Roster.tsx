import * as React from 'react';
import { Tree, Flex } from '@fluentui/react-northstar';
import { RosterItem } from './RosterItem';
import { ActionsContext } from './actionsContext';
import { initialRosterData } from './data/initialRosterData';
import { RosterSectionTitle } from './RosterTitle';
import { useRosterActions } from './hooks/useRosterActions';
import { rosterStyles, rosterTreeStyles } from './styles/styles';

export const Roster: React.FunctionComponent<{}> = () => {
  return (
    <Flex styles={rosterStyles}>
      <RosterContent />
    </Flex>
  );
};

const components = {
  header(Component, { open, content, ...restProps }) {
    return (
      <Component {...restProps}>
        <RosterSectionTitle open={open} type={content} />
      </Component>
    );
  },
  item(_, { type, userId, displayName, visuals, isMuted }) {
    return (
      <RosterItem
        id={userId}
        key={userId}
        userId={userId}
        displayName={displayName}
        visuals={visuals}
        type={type}
        isMuted={isMuted}
      />
    );
  },
};

const titleRenderer = (Component, props) => {
  const componentType = props.hasSubtree ? 'header' : 'item';
  return components[componentType](Component, props);
};

const RosterContent: React.FunctionComponent<{}> = () => {
  const [rosterData, setRosterData] = React.useState(initialRosterData);
  const actions = useRosterActions(rosterData, setRosterData);
  return (
    <ActionsContext.Provider value={actions}>
      <Tree as="div" items={rosterData} styles={rosterTreeStyles} renderItemTitle={titleRenderer} />
    </ActionsContext.Provider>
  );
};
