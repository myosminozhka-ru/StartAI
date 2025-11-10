import PropTypes from 'prop-types'
import { DataGrid } from '@mui/x-data-grid'
import { ruRU } from '@mui/x-data-grid/locales'

export const Grid = ({ columns, rows, style, disabled = false, onRowUpdate }) => {
    const handleProcessRowUpdate = (newRow) => {
        onRowUpdate(newRow)
        return newRow
    }

    return (
        <>
            {rows && columns && (
                <div style={{ marginTop: 10, height: 300, width: '100%', ...style }}>
                    <DataGrid
                        processRowUpdate={handleProcessRowUpdate}
                        isCellEditable={() => {
                            return !disabled
                        }}
                        onProcessRowUpdateError={(error) => console.error(error)}
                        rows={rows}
                        columns={columns}
                        localeText={ruRU.components.MuiDataGrid.defaultProps.localeText}
                    />
                </div>
            )}
        </>
    )
}

Grid.propTypes = {
    rows: PropTypes.array,
    columns: PropTypes.array,
    style: PropTypes.any,
    disabled: PropTypes.bool,
    onRowUpdate: PropTypes.func
}
