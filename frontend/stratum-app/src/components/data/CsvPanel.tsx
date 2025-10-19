import React from 'react';
import GridPanel from './GridPanel';

interface Props {
  table: string[][];
  setTable: (updater: (prev: string[][]) => string[][]) => void;
  editing: boolean;
  onDirty: () => void;
}

export default function CsvPanel(props: Props) {
  return <GridPanel {...props} />;
}
