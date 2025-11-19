import PropTypes from 'prop-types'
import { TableContainer, Table, TableHead, TableCell, TableRow, TableBody, Paper, Chip, Stack, Typography } from '@mui/material'
import { TooltipWithParser } from '@/ui-component/tooltip/TooltipWithParser'

export const TableViewOnly = ({ columns, rows, sx }) => {
    // Вспомогательная функция для безопасного отображения содержимого ячейки
    const renderCellContent = (key, row) => {
        if (row[key] === null || row[key] === undefined) {
            return ''
        } else if (key === 'enabled') {
            return row[key] ? <Chip label='Включено' color='primary' /> : <Chip label='Отключено' />
        } else if (key === 'type' && row.schema) {
            // Если есть информация о схеме, добавляем подсказку
            const schemaContent =
                '[<br>' +
                row.schema
                    .map(
                        (item) =>
                            `&nbsp;&nbsp;${JSON.stringify(
                                {
                                    [item.name]: item.type
                                },
                                null,
                                2
                            )}`
                    )
                    .join(',<br>') +
                '<br>]'

            return (
                <Stack direction='row' alignItems='center' spacing={1}>
                    <Typography>{row[key]}</Typography>
                    <TooltipWithParser title={`<div>Схема:<br/>${schemaContent}</div>`} />
                </Stack>
            )
        } else if (typeof row[key] === 'object') {
            // Для других объектов (которые не обрабатываются специальными случаями выше)
            return JSON.stringify(row[key])
        } else {
            return row[key]
        }
    }

    return (
        <>
            <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650, ...sx }} aria-label='простая таблица'>
                    <TableHead>
                        <TableRow>
                            {columns.map((col, index) => (
                                <TableCell key={index}>
                                    {col === 'enabled' ? (
                                        <>
                                            Переопределение
                                            <TooltipWithParser
                                                style={{ mb: 1, mt: 2, marginLeft: 10 }}
                                                title={
                                                    'Если включено, эта переменная может быть переопределена в API-вызовах и встраиваниях. Если отключено, любые переопределения будут проигнорированы. Чтобы изменить это, перейдите в настройки безопасности в Конфигурации агента.'
                                                }
                                            />
                                        </>
                                    ) : (
                                        col.charAt(0).toUpperCase() + col.slice(1)
                                    )}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row, index) => (
                            <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                {Object.keys(row).map((key, index) => {
                                    if (key !== 'id' && key !== 'schema') {
                                        return <TableCell key={index}>{renderCellContent(key, row)}</TableCell>
                                    }
                                })}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </>
    )
}

TableViewOnly.propTypes = {
    rows: PropTypes.array,
    columns: PropTypes.array,
    sx: PropTypes.object
}
