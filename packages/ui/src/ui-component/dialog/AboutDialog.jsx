import { createPortal } from 'react-dom'
import { useState } from 'react'
import PropTypes from 'prop-types'
import { Dialog, DialogContent, DialogTitle, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Paper } from '@mui/material'

const AboutDialog = ({ show, onCancel }) => {
    const portalElement = document.getElementById('portal')

    const [data, setData] = useState({})

    // useEffect(() => {
    //     if (show) {
    //         const latestReleaseReq = axios.get('https://osmi-ai.ru/')
    //         const currentVersionReq = axios.get(`${baseURL}/api/v1/version`, {
    //             withCredentials: true,
    //             headers: { 'Content-type': 'application/json', 'x-request-from': 'internal' }
    //         })

    //         Promise.all([latestReleaseReq, currentVersionReq])
    //             .then(([latestReleaseData, currentVersionData]) => {
    //                 const finalData = {
    //                     ...latestReleaseData.data,
    //                     currentVersion: currentVersionData.data.version
    //                 }
    //                 setData(finalData)
    //             })
    //             .catch((error) => {
    //                 console.error('Error fetching data:', error)
    //             })
    //     }

    //     // eslint-disable-next-line react-hooks/exhaustive-deps
    // }, [show])

    const component = show ? (
        <Dialog
            onClose={onCancel}
            open={show}
            fullWidth
            maxWidth='sm'
            aria-labelledby='alert-dialog-title'
            aria-describedby='alert-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='alert-dialog-title'>
                Версия Osmi AI
            </DialogTitle>
            <DialogContent>
                {data && (
                    <TableContainer component={Paper}>
                        <Table aria-label='simple table'>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Текущая версия</TableCell>
                                    <TableCell>Последняя версия</TableCell>
                                    <TableCell>Дата публикации</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                    <TableCell component='th' scope='row'>
                                        3.0.8
                                    </TableCell>
                                    <TableCell component='th' scope='row'>
                                        <a target='_blank' rel='noreferrer' href='https://app.osmi-ai.ru/'>
                                            Osmi AI
                                        </a>
                                    </TableCell>
                                    <TableCell>10.10.2025</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </DialogContent>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

AboutDialog.propTypes = {
    show: PropTypes.bool,
    onCancel: PropTypes.func
}

export default AboutDialog
