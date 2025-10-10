import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'

// Material
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Box, Typography, Stack } from '@mui/material'

// Project imports
import { StyledButton } from '@/ui-component/button/StyledButton'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import { File } from '@/ui-component/file/File'

// Icons
import { IconFileUpload, IconX } from '@tabler/icons-react'

// API
import apikeyAPI from '@/api/apikey'

// utils
import useNotifier from '@/utils/useNotifier'

// const
import { HIDE_CANVAS_DIALOG, SHOW_CANVAS_DIALOG } from '@/store/actions'
import { Dropdown } from '@/ui-component/dropdown/Dropdown'

const importModes = [
    {
        label: 'Добавить и перезаписать',
        name: 'overwriteIfExist',
        description: 'Добавить ключи и перезаписать существующие ключи с таким же именем'
    },
    {
        label: 'Добавить и пропустить',
        name: 'ignoreIfExist',
        description: 'Добавить ключи и пропустить существующие ключи с таким же именем'
    },
    {
        label: 'Добавить и проверить',
        name: 'errorIfExist',
        description: 'Добавить ключи и выдать ошибку, если ключ с таким именем существует'
    },
    {
        label: 'Заменить все',
        name: 'replaceAll',
        description: 'Заменить все ключи импортированными ключами'
    }
]

const UploadJSONFileDialog = ({ show, dialogProps, onCancel, onConfirm }) => {
    const portalElement = document.getElementById('portal')

    const dispatch = useDispatch()

    // ==============================|| Snackbar ||============================== //

    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [selectedFile, setSelectedFile] = useState()
    const [importMode, setImportMode] = useState('overwrite')

    useEffect(() => {
        return () => {
            setSelectedFile()
        }
    }, [dialogProps])

    useEffect(() => {
        if (show) dispatch({ type: SHOW_CANVAS_DIALOG })
        else dispatch({ type: HIDE_CANVAS_DIALOG })
        return () => dispatch({ type: HIDE_CANVAS_DIALOG })
    }, [show, dispatch])

    const importKeys = async () => {
        try {
            const obj = {
                importMode: importMode,
                jsonFile: selectedFile
            }
            const createResp = await apikeyAPI.importAPI(obj)
            if (createResp.data) {
                enqueueSnackbar({
                    message: 'Ключи успешно импортированы!',
                    options: {
                        key: new Date().getTime() + Math.random(),
                        variant: 'success',
                        action: (key) => (
                            <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                                <IconX />
                            </Button>
                        )
                    }
                })
                onConfirm(createResp.data.id)
            }
        } catch (error) {
            enqueueSnackbar({
                message: `Не удалось импортировать ключи: ${
                    typeof error.response.data === 'object' ? error.response.data.message : error.response.data
                }`,
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    persist: true,
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
            onCancel()
        }
    }

    const component = show ? (
        <Dialog
            fullWidth
            maxWidth='sm'
            open={show}
            onClose={onCancel}
            aria-labelledby='alert-dialog-title'
            aria-describedby='alert-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='alert-dialog-title'>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                    <IconFileUpload style={{ marginRight: '10px' }} />
                    Импорт API ключей
                </div>
            </DialogTitle>
            <DialogContent>
                <Box sx={{ p: 2 }}>
                    <Stack sx={{ position: 'relative' }} direction='row'>
                        <Typography variant='overline'>
                            Импорт файла api.json
                            <span style={{ color: 'red' }}>&nbsp;*</span>
                        </Typography>
                    </Stack>
                    <File
                        disabled={false}
                        fileType='.json'
                        onChange={(newValue) => setSelectedFile(newValue)}
                        value={selectedFile ?? 'Выберите файл для загрузки'}
                    />
                </Box>
                <Box sx={{ p: 2 }}>
                    <Stack sx={{ position: 'relative' }} direction='row'>
                        <Typography variant='overline'>
                            Режим импорта
                            <span style={{ color: 'red' }}>&nbsp;*</span>
                        </Typography>
                    </Stack>
                    <Dropdown
                        key={importMode}
                        name={importMode}
                        options={importModes}
                        onSelect={(newValue) => setImportMode(newValue)}
                        value={importMode ?? 'выберите опцию'}
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => onCancel()}>{dialogProps.cancelButtonName}</Button>
                <StyledButton disabled={!selectedFile} variant='contained' onClick={importKeys}>
                    {dialogProps.confirmButtonName}
                </StyledButton>
            </DialogActions>
            <ConfirmDialog />
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

UploadJSONFileDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func
}

export default UploadJSONFileDialog
