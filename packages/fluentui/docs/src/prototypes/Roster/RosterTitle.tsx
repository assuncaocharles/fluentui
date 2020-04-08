import * as React from 'react';
import { Flex, Provider, Animation } from '@fluentui/react-northstar';
import { ArrowRightIcon, ArrowDownIcon } from '@fluentui/react-icons-northstar';

const fadeOut = {
  keyframe: {
    from: {
      opacity: '1',
    },
    to: {
      opacity: '0',
    },
  },
  delay: '4s',
  duration: '1s',
  iterationCount: '1',
  fillMode: 'forwards',
};

export const RosterSectionTitle: (Component, props) => React.ReactNode = (
  Component,
  { expanded, key, ...restProps },
) => {
  return (
    <Flex key={key}>
      <Provider
        theme={{
          animations: {
            fadeOut,
          },
        }}
      >
        <Animation name="fadeOut">{expanded ? <ArrowDownIcon /> : <ArrowRightIcon />}</Animation>
      </Provider>
      <Component {...restProps} />
    </Flex>
  );
};
