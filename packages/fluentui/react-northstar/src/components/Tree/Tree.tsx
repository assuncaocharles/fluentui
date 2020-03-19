import { Accessibility, treeBehavior } from '@fluentui/accessibility';
import { ReactAccessibilityBehavior, getNextElement } from '@fluentui/react-bindings';
import * as customPropTypes from '@fluentui/react-proptypes';
import * as _ from 'lodash';
import * as PropTypes from 'prop-types';
import * as React from 'react';
import { Ref } from '@fluentui/react-component-ref';

import TreeItem, { TreeItemProps } from './TreeItem';
import TreeTitle, { TreeTitleProps } from './TreeTitle';
import * as keyboardKey from 'keyboard-key';
import {
  childrenExist,
  commonPropTypes,
  createShorthandFactory,
  UIComponentProps,
  ChildrenComponentProps,
  rtlTextContainer,
  applyAccessibilityKeyHandlers,
  AutoControlledComponent,
  ShorthandFactory,
} from '../../utils';
import {
  ShorthandRenderFunction,
  WithAsProp,
  withSafeTypeForAs,
  ShorthandCollection,
  ShorthandValue,
  ComponentEventHandler,
} from '../../types';
import { hasSubtree, removeItemAtIndex, getSiblings, TreeContext, TreeRenderContextValue } from './utils';

export interface TreeSlotClassNames {
  item: string;
}

export interface TreeProps extends UIComponentProps, ChildrenComponentProps {
  /** Accessibility behavior if overridden by the user. */
  accessibility?: Accessibility;

  /** Ids of expanded items. */
  activeItemIds?: string[];

  /** Ids of selected items. */
  selectedItemIds?: string[];

  /** Initial activeItemIds value. */
  defaultActiveItemIds?: string[];

  /** Only allow one subtree to be expanded at a time. */
  exclusive?: boolean;

  /** Shorthand array of props for Tree. */
  items?: ShorthandCollection<TreeItemProps>;

  /**
   * A custom render function for the title slot.
   *
   * @param Component - The computed component for this slot.
   * @param props - The computed props for this slot.
   * @param children - The computed children for this slot.
   */
  renderItemTitle?: ShorthandRenderFunction<TreeTitleProps>;

  /**
   * Called when active item ids change.
   * @param event - React's original SyntheticEvent.
   * @param data - All props, with `activeItemIds` reflecting the new state.
   */
  onActiveItemIdsChange?: ComponentEventHandler<TreeProps>;

  /**
   * Called when tree item selection state is changed.
   * @param event - React's original SyntheticEvent.
   * @param data - All props, with `selectedItemIds` reflecting the new state.
   */
  onSelectedItemIdsChange?: ComponentEventHandler<TreeProps>;

  /**
   * Callback that provides rendered tree items to be used by react-virtualized for instance.
   * Acts as a render prop, with the rendered tree items being the re-used logic.
   *
   * @param renderedItem - The array of rendered items.
   * @returns The render prop result.
   */
  renderedItems?: (renderedItems: React.ReactElement[]) => React.ReactNode;

  /** Whether or not tree items are selectable. */
  selectable?: boolean;
}

export interface TreeItemForRenderProps {
  elementRef: React.RefObject<HTMLElement>;
  id: string;
  index: number;
  level: number;
  parent: string;
  siblings: ShorthandCollection<TreeItemProps>;
}

export interface TreeState {
  activeItemIds: string[];
  selectedItemIds: string[];
}

class Tree extends AutoControlledComponent<WithAsProp<TreeProps>, TreeState> {
  static create: ShorthandFactory<TreeProps>;

  static displayName = 'Tree';

  static className = 'ui-tree';

  static slotClassNames: TreeSlotClassNames = {
    item: `${Tree.className}__item`,
  };

  static propTypes = {
    ...commonPropTypes.createCommon({
      content: false,
    }),
    activeItemIds: customPropTypes.collectionShorthand,
    selectedItemIds: customPropTypes.collectionShorthand,
    defaultActiveItemIds: customPropTypes.collectionShorthand,
    exclusive: PropTypes.bool,
    selectable: PropTypes.bool,
    items: customPropTypes.collectionShorthand,
    onActiveItemIdsChange: PropTypes.func,
    onSelectedItemIdsChange: PropTypes.func,
    renderItemTitle: PropTypes.func,
    renderedItems: PropTypes.func,
  };

  static defaultProps = {
    as: 'div',
    accessibility: treeBehavior as Accessibility,
  };

  static autoControlledProps = ['activeItemIds', 'selectedItemIds'];

  static Item = TreeItem;
  static Title = TreeTitle;

  static getAutoControlledStateFromProps(nextProps: TreeProps, prevState: TreeState) {
    const { items, selectable } = nextProps;
    let { activeItemIds, selectedItemIds } = nextProps;

    if (selectable) {
      if (!selectedItemIds && items) {
        selectedItemIds = prevState.selectedItemIds;

        const iterateItems = (items, selectedItems = selectedItemIds) => {
          _.forEach(items, item => {
            if (item['selected'] && selectedItemIds.indexOf(item['id']) === -1) {
              selectedItems.push(item['id']);
            }
            if (item['items']) {
              return iterateItems(item['items']);
            }
          });
        };

        iterateItems(items);
        // console log only before PR is merge to master, for testing purposes :)
        console.log('All items with seleted property:');
        console.log(selectedItemIds);
      }
    }

    if (!activeItemIds && items) {
      activeItemIds = prevState.activeItemIds;

      const expandedItemsGenerator = (items, acc = activeItemIds) =>
        _.reduce(
          items,
          (acc, item) => {
            if (item['expanded'] && acc.indexOf(item['id']) === -1) {
              acc.push(item['id']);
            }

            if (item['items']) {
              return expandedItemsGenerator(item['items'], acc);
            }

            return acc;
          },
          acc,
        );

      expandedItemsGenerator(items);
    }

    return {
      activeItemIds: activeItemIds,
      selectedItemIds: selectedItemIds,
    };
  }

  getInitialAutoControlledState() {
    return { activeItemIds: [], selectedItemIds: [] };
  }

  treeRef = React.createRef<HTMLElement>();
  itemsRef = new Map<string, React.RefObject<HTMLElement>>();

  onFocusParent = (parent: string) => {
    const parentRef = this.itemsRef.get(parent);

    if (!parentRef || !parentRef.current) {
      return;
    }

    parentRef.current.focus();
  };

  setSelectedItemIds = (e: React.SyntheticEvent, selectedItemIds: string[]) => {
    _.invoke(this.props, 'onSelectedItemIdsChange', e, { ...this.props, selectedItemIds });

    this.setState({
      selectedItemIds: selectedItemIds,
    });
  };

  processItemForSelection = (e: React.SyntheticEvent, treeItemProps: TreeItemProps) => {
    let { selectedItemIds } = this.state;
    const { id, selectableParent, items, expanded } = treeItemProps;
    const treeItemHasSubtree = hasSubtree(treeItemProps);
    const isExpandedSelectableParent = treeItemHasSubtree && selectableParent && expanded;

    // selection is exectued only with space or click
    if (e.nativeEvent['keyCode'] === keyboardKey.Enter) {
      return;
    }
    // if the parent is not selectable or is collapsed it means treeItem should be expanded, not procced with selection
    if ((treeItemHasSubtree && !selectableParent) || (treeItemHasSubtree && !expanded)) {
      return;
    }

    // if the target is equal to currentTarget it means treeItem should be collapsed, not procced with selection
    if (isExpandedSelectableParent && e.target === e.currentTarget) {
      return;
    }

    // push all tree items under particular parent into selection array
    // not parent itself, therefore not procced with selection
    if (isExpandedSelectableParent) {
      items.forEach(item => {
        if (selectedItemIds.indexOf(item['id']) === -1) {
          selectedItemIds.push(item['id']);
        }
      });
      this.setSelectedItemIds(e, selectedItemIds);
      return;
    }

    // push/remove single tree item into selection array
    if (selectedItemIds.indexOf(id) === -1) {
      selectedItemIds.push(id);
    } else {
      selectedItemIds = removeItemAtIndex(selectedItemIds, selectedItemIds.indexOf(id));
    }

    this.setSelectedItemIds(e, selectedItemIds);
  };

  onTitleClick = (e: React.SyntheticEvent, treeItemProps: TreeItemProps) => {
    if (this.props.selectable) {
      this.processItemForSelection(e, treeItemProps);
      // do not continue with collapsing if the parent is selectable and selection on parent was executed
      if (treeItemProps.selectableParent && treeItemProps.expanded && e.target !== e.currentTarget) {
        return;
      }
    }

    if (!hasSubtree(treeItemProps)) {
      return;
    }

    let { activeItemIds } = this.state;
    const { id } = treeItemProps;
    const { exclusive, items } = this.props;
    const siblings = getSiblings(items, id);

    const activeItemIdIndex = activeItemIds.indexOf(id);

    if (activeItemIdIndex > -1) {
      activeItemIds = removeItemAtIndex(activeItemIds, activeItemIdIndex);
    } else {
      if (exclusive) {
        siblings.some(sibling => {
          const activeSiblingIdIndex = activeItemIds.indexOf(sibling['id']);
          if (activeSiblingIdIndex > -1) {
            activeItemIds = removeItemAtIndex(activeItemIds, activeSiblingIdIndex);

            return true;
          }
          return false;
        });
      }

      activeItemIds = [...activeItemIds, id];
    }

    this.setActiveItemIds(e, activeItemIds);
  };

  onFocusFirstChild = (itemId: string) => {
    const currentElement = this.itemsRef.get(itemId);

    if (!currentElement || !currentElement.current) {
      return;
    }

    const elementToBeFocused = getNextElement(this.treeRef.current, currentElement.current);

    if (!elementToBeFocused) {
      return;
    }

    elementToBeFocused.focus();
  };

  onSiblingsExpand = (e: React.SyntheticEvent, treeItemProps: TreeItemProps) => {
    const { exclusive, items } = this.props;
    if (exclusive) {
      return;
    }

    const { id } = treeItemProps;
    const { activeItemIds } = this.state;
    const siblings = getSiblings(items, id);

    siblings.forEach(sibling => {
      if (hasSubtree(sibling) && !this.isActiveItem(sibling['id'])) {
        activeItemIds.push(sibling['id']);
      }
    });

    if (hasSubtree(treeItemProps) && !this.isActiveItem(id)) {
      activeItemIds.push(id);
    }

    this.setActiveItemIds(e, activeItemIds);
  };

  setActiveItemIds = (e: React.SyntheticEvent, activeItemIds: string[]) => {
    _.invoke(this.props, 'onActiveItemIdsChange', e, { ...this.props, activeItemIds });

    this.setState({
      activeItemIds,
    });
  };

  contextValue: TreeRenderContextValue = {
    onFocusParent: this.onFocusParent,
    onSiblingsExpand: this.onSiblingsExpand,
    onFocusFirstChild: this.onFocusFirstChild,
    onTitleClick: this.onTitleClick,
  };

  renderContent(accessibility: ReactAccessibilityBehavior): React.ReactElement[] {
    const { items, renderItemTitle, selectable } = this.props;

    if (!items) return null;

    const renderItems = (
      items: ShorthandCollection<TreeItemProps>,
      level = 1,
      parent?: string,
    ): React.ReactElement[] => {
      return items.reduce((renderedItems: React.ReactElement[], item: ShorthandValue<TreeItemProps>, index: number) => {
        const itemId = item['id'];
        const isSubtree = hasSubtree(item);
        const isSubtreeExpanded = isSubtree && this.isActiveItem(itemId);
        const isSelectedItem = this.isSelectedItem(itemId);

        if (!this.itemsRef.has(itemId)) {
          this.itemsRef.set(itemId, React.createRef<HTMLElement>());
        }

        const renderedItem = TreeItem.create(item, {
          defaultProps: () => ({
            accessibility: accessibility.childBehaviors ? accessibility.childBehaviors.item : undefined,
            className: Tree.slotClassNames.item,
            expanded: isSubtreeExpanded,
            selected: isSelectedItem,
            selectable,
            renderItemTitle,
            key: item['id'],
            parent,
            level,
            index: index + 1, // Used for aria-posinset and it's 1-based.
            contentRef: this.itemsRef.get(itemId),
            treeSize: items.length,
          }),
        });

        return [
          ...renderedItems,
          renderedItem,
          ...(isSubtreeExpanded ? renderItems(item['items'], level + 1, itemId) : ([] as any)),
        ];
      }, []);
    };

    return renderItems(items);
  }

  renderComponent({ ElementType, classes, accessibility, unhandledProps }) {
    const { children, renderedItems } = this.props;

    return (
      <TreeContext.Provider value={this.contextValue}>
        <Ref innerRef={this.treeRef}>
          <ElementType
            className={classes.root}
            {...accessibility.attributes.root}
            {...rtlTextContainer.getAttributes({ forElements: [children] })}
            {...unhandledProps}
            {...applyAccessibilityKeyHandlers(accessibility.keyHandlers.root, unhandledProps)}
          >
            {childrenExist(children)
              ? children
              : renderedItems
              ? renderedItems(this.renderContent(accessibility))
              : this.renderContent(accessibility)}
          </ElementType>
        </Ref>
      </TreeContext.Provider>
    );
  }

  isActiveItem = (id: string): boolean => {
    const { activeItemIds } = this.state;
    return activeItemIds.indexOf(id) > -1;
  };

  isSelectedItem = (id: string): boolean => {
    const { selectedItemIds } = this.state;
    return selectedItemIds && selectedItemIds.indexOf(id) > -1;
  };
}

Tree.create = createShorthandFactory({
  Component: Tree,
  mappedArrayProp: 'items',
});

/**
 * A Tree displays data organised in tree hierarchy.
 *
 * @accessibility
 * Implements [ARIA TreeView](https://www.w3.org/TR/wai-aria-practices-1.1/#TreeView) design pattern.
 * @accessibilityIssues
 * [Treeview - JAWS doesn't narrate position for each tree item](https://github.com/FreedomScientific/VFO-standards-support/issues/338)
 * [Aria compliant trees are read as empty tables](https://bugs.chromium.org/p/chromium/issues/detail?id=1048770)
 */

export default withSafeTypeForAs<typeof Tree, TreeProps, 'ul'>(Tree);
