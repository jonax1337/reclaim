import {
  Skeleton as FluentSkeleton,
  SkeletonItem,
  makeStyles,
  tokens,
  shorthands
} from '@fluentui/react-components';

const useStyles = makeStyles({
  list: {
    display: 'flex',
    flexDirection: 'column',
    rowGap: tokens.spacingVerticalS
  },
  card: {
    display: 'grid',
    gridTemplateColumns: '18px 1fr 40px',
    columnGap: tokens.spacingHorizontalL,
    alignItems: 'flex-start',
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL),
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusXLarge,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2)
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    rowGap: tokens.spacingVerticalS
  }
});

export function Skeleton({ count = 5 }: { count?: number }) {
  const s = useStyles();
  return (
    <div className={s.list}>
      {Array.from({ length: count }).map((_, i) => (
        <FluentSkeleton key={i} className={s.card} animation="wave">
          <SkeletonItem shape="square" size={16} />
          <div className={s.body}>
            <SkeletonItem size={12} style={{ width: '40%' }} />
            <SkeletonItem size={12} style={{ width: '90%' }} />
            <SkeletonItem size={12} style={{ width: '70%' }} />
            <SkeletonItem size={8} style={{ width: '30%' }} />
          </div>
          <SkeletonItem shape="rectangle" size={20} style={{ width: 40, borderRadius: 999 }} />
        </FluentSkeleton>
      ))}
    </div>
  );
}
