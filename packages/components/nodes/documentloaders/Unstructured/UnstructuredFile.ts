import { omit } from 'lodash'
import { ICommonObject, IDocument, INode, INodeData, INodeParams } from '../../../src/Interface'
import {
    UnstructuredLoaderOptions,
    UnstructuredLoaderStrategy,
    SkipInferTableTypes,
    HiResModelName,
    UnstructuredLoader as LCUnstructuredLoader
} from '@langchain/community/document_loaders/fs/unstructured'
import { getCredentialData, getCredentialParam, handleEscapeCharacters } from '../../../src/utils'
import { getFileFromStorage, INodeOutputsValue } from '../../../src'
import { UnstructuredLoader } from './Unstructured'

class UnstructuredFile_DocumentLoaders implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Загрузчик файлов Unstructured'
        this.name = 'unstructuredFileLoader'
        this.version = 4.0
        this.type = 'Document'
        this.icon = 'unstructured-file.svg'
        this.category = 'Document Loaders'
        this.description = 'Использовать Unstructured.io для загрузки данных из файла'
        this.baseClasses = [this.type]
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            credentialNames: ['unstructuredApi'],
            optional: true
        }
        this.inputs = [
            /** Deprecated
            {
                label: 'File Path',
                name: 'filePath',
                type: 'string',
                placeholder: '',
                optional: true,
                warning:
                    'Use the File Upload instead of File path. If file is uploaded, this path is ignored. Path will be deprecated in future releases.'
            },
             */
            {
                label: 'Загрузка файлов',
                name: 'fileObject',
                type: 'file',
                description: 'Файлы для обработки. Можно загрузить несколько файлов.',
                fileType:
                    '.txt, .text, .pdf, .docx, .doc, .jpg, .jpeg, .eml, .html, .htm, .md, .pptx, .ppt, .msg, .rtf, .xlsx, .xls, .odt, .epub'
            },
            {
                label: 'URL API Unstructured',
                name: 'unstructuredAPIUrl',
                description:
                    'URL API Unstructured. Подробнее о том, как начать работу, читайте <a target="_blank" href="https://docs.unstructured.io/api-reference/api-services/saas-api-development-guide">здесь</a>',
                type: 'string',
                placeholder: process.env.UNSTRUCTURED_API_URL || 'http://localhost:8000/general/v0/general',
                optional: !!process.env.UNSTRUCTURED_API_URL
            },
            {
                label: 'Стратегия',
                name: 'strategy',
                description: 'Стратегия для разделения PDF/изображения. Варианты: fast, hi_res, auto. По умолчанию: auto.',
                type: 'options',
                options: [
                    {
                        label: 'Высокое разрешение',
                        name: 'hi_res'
                    },
                    {
                        label: 'Быстрая',
                        name: 'fast'
                    },
                    {
                        label: 'Только OCR',
                        name: 'ocr_only'
                    },
                    {
                        label: 'Авто',
                        name: 'auto'
                    }
                ],
                optional: true,
                additionalParams: true,
                default: 'auto'
            },
            {
                label: 'Кодировка',
                name: 'encoding',
                description: 'Метод кодировки, используемый для декодирования текстового ввода. По умолчанию: utf-8.',
                type: 'string',
                optional: true,
                additionalParams: true,
                default: 'utf-8'
            },
            {
                label: 'Пропустить типы таблиц',
                name: 'skipInferTableTypes',
                description: 'Типы документов, для которых нужно пропустить извлечение таблиц. По умолчанию: pdf, jpg, png.',
                type: 'multiOptions',
                options: [
                    {
                        label: 'doc',
                        name: 'doc'
                    },
                    {
                        label: 'docx',
                        name: 'docx'
                    },
                    {
                        label: 'eml',
                        name: 'eml'
                    },
                    {
                        label: 'epub',
                        name: 'epub'
                    },
                    {
                        label: 'heic',
                        name: 'heic'
                    },
                    {
                        label: 'htm',
                        name: 'htm'
                    },
                    {
                        label: 'html',
                        name: 'html'
                    },
                    {
                        label: 'jpeg',
                        name: 'jpeg'
                    },
                    {
                        label: 'jpg',
                        name: 'jpg'
                    },
                    {
                        label: 'md',
                        name: 'md'
                    },
                    {
                        label: 'msg',
                        name: 'msg'
                    },
                    {
                        label: 'odt',
                        name: 'odt'
                    },
                    {
                        label: 'pdf',
                        name: 'pdf'
                    },
                    {
                        label: 'png',
                        name: 'png'
                    },
                    {
                        label: 'ppt',
                        name: 'ppt'
                    },
                    {
                        label: 'pptx',
                        name: 'pptx'
                    },
                    {
                        label: 'rtf',
                        name: 'rtf'
                    },
                    {
                        label: 'text',
                        name: 'text'
                    },
                    {
                        label: 'txt',
                        name: 'txt'
                    },
                    {
                        label: 'xls',
                        name: 'xls'
                    },
                    {
                        label: 'xlsx',
                        name: 'xlsx'
                    }
                ],
                optional: true,
                additionalParams: true,
                default: '["pdf", "jpg", "png"]'
            },
            {
                label: 'Имя модели высокого разрешения',
                name: 'hiResModelName',
                description: 'Название модели вывода, используемой при стратегии hi_res',
                type: 'options',
                options: [
                    {
                        label: 'chipper',
                        name: 'chipper',
                        description:
                            'Эксклюзивно для размещенного API Unstructured. Модель Chipper - это внутренняя модель преобразования изображений в текст Unstructured, основанная на моделях визуального понимания документов (VDU) на базе трансформеров.'
                    },
                    {
                        label: 'detectron2_onnx',
                        name: 'detectron2_onnx',
                        description:
                            'Модель компьютерного зрения от Facebook AI, которая предоставляет алгоритмы обнаружения и сегментации объектов с использованием ONNX Runtime. Это самая быстрая модель со стратегией hi_res.'
                    },
                    {
                        label: 'yolox',
                        name: 'yolox',
                        description:
                            'Одноэтапный детектор объектов в реальном времени, который модифицирует YOLOv3 с использованием бэкбона DarkNet53.'
                    },
                    {
                        label: 'yolox_quantized',
                        name: 'yolox_quantized',
                        description: 'Работает быстрее, чем YoloX, и его скорость ближе к Detectron2.'
                    }
                ],
                optional: true,
                additionalParams: true
            },
            {
                label: 'Стратегия разделения',
                name: 'chunkingStrategy',
                description:
                    'Используйте одну из поддерживаемых стратегий для разделения возвращаемых элементов. При пропуске разделение не выполняется, и любые другие предоставленные параметры разделения игнорируются. По умолчанию: by_title',
                type: 'options',
                options: [
                    {
                        label: 'Нет',
                        name: 'None'
                    },
                    {
                        label: 'Базовая',
                        name: 'basic'
                    },
                    {
                        label: 'По заголовку',
                        name: 'by_title'
                    },
                    {
                        label: 'По странице',
                        name: 'by_page'
                    },
                    {
                        label: 'По схожести',
                        name: 'by_similarity'
                    }
                ],
                optional: true,
                additionalParams: true,
                default: 'by_title'
            },
            {
                label: 'Языки OCR',
                name: 'ocrLanguages',
                description:
                    'Языки для использования в OCR. Примечание: Устаревает, так как languages - это новый тип. Ожидает обновления langchain.',
                type: 'multiOptions',
                options: [
                    {
                        label: 'English',
                        name: 'eng'
                    },
                    {
                        label: 'Spanish (Español)',
                        name: 'spa'
                    },
                    {
                        label: 'Mandarin Chinese (普通话)',
                        name: 'cmn'
                    },
                    {
                        label: 'Hindi (हिन्दी)',
                        name: 'hin'
                    },
                    {
                        label: 'Arabic (اَلْعَرَبِيَّةُ)',
                        name: 'ara'
                    },
                    {
                        label: 'Portuguese (Português)',
                        name: 'por'
                    },
                    {
                        label: 'Bengali (বাংলা)',
                        name: 'ben'
                    },
                    {
                        label: 'Russian (Русский)',
                        name: 'rus'
                    },
                    {
                        label: 'Japanese (日本語)',
                        name: 'jpn'
                    },
                    {
                        label: 'Punjabi (ਪੰਜਾਬੀ)',
                        name: 'pan'
                    },
                    {
                        label: 'German (Deutsch)',
                        name: 'deu'
                    },
                    {
                        label: 'Korean (한국어)',
                        name: 'kor'
                    },
                    {
                        label: 'French (Français)',
                        name: 'fra'
                    },
                    {
                        label: 'Italian (Italiano)',
                        name: 'ita'
                    },
                    {
                        label: 'Vietnamese (Tiếng Việt)',
                        name: 'vie'
                    }
                ],
                optional: true,
                additionalParams: true
            },
            {
                label: 'Ключ ID источника',
                name: 'sourceIdKey',
                type: 'string',
                description:
                    'Ключ, используемый для получения истинного источника документа, для сравнения с записью. Метаданные документа должны содержать ключ ID источника.',
                default: 'source',
                placeholder: 'source',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Координаты',
                name: 'coordinates',
                type: 'boolean',
                description: 'Если true, возвращает координаты для каждого элемента. По умолчанию: false.',
                optional: true,
                additionalParams: true,
                default: false
            },
            {
                label: 'Сохранять XML теги',
                name: 'xmlKeepTags',
                description:
                    'Если True, сохранит XML теги в выводе. В противном случае просто извлечет текст из тегов. Применяется только к partition_xml.',
                type: 'boolean',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Включать разрывы страниц',
                name: 'includePageBreaks',
                description: 'Когда true, вывод будет включать элементы разрыва страниц, если тип файла это поддерживает.',
                type: 'boolean',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Многостраничные разделы',
                name: 'multiPageSections',
                description: 'Обрабатывать ли многостраничные документы как отдельные разделы.',
                type: 'boolean',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Объединять до N символов',
                name: 'combineUnderNChars',
                description:
                    'Если установлена стратегия разделения, объединять элементы, пока раздел не достигнет длины n символов. По умолчанию: значение max_characters. Не может превышать значение max_characters.',
                type: 'number',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Новый после N символов',
                name: 'newAfterNChars',
                description:
                    'Если установлена стратегия разделения, обрезать новые разделы после достижения длины n символов (мягкий максимум). Значение max_characters. Не может превышать значение max_characters.',
                type: 'number',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Максимум символов',
                name: 'maxCharacters',
                description:
                    'Если установлена стратегия разделения, обрезать новые разделы после достижения длины n символов (жесткий максимум). По умолчанию: 500',
                type: 'number',
                optional: true,
                additionalParams: true,
                default: '500'
            },
            {
                label: 'Дополнительные метаданные',
                name: 'metadata',
                type: 'json',
                description: 'Дополнительные метаданные для добавления к извлеченным документам',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Исключить ключи метаданных',
                name: 'omitMetadataKeys',
                type: 'string',
                rows: 4,
                description:
                    'Каждый загрузчик документов поставляется с набором метаданных по умолчанию, которые извлекаются из документа. Вы можете использовать это поле, чтобы исключить некоторые ключи метаданных по умолчанию. Значение должно быть списком ключей, разделенных запятыми. Используйте * для исключения всех ключей метаданных, кроме тех, которые вы указываете в поле Дополнительные метаданные',
                placeholder: 'key1, key2, key3.nestedKey1',
                optional: true,
                additionalParams: true
            }
        ]
        this.outputs = [
            {
                label: 'Документ',
                name: 'document',
                description: 'Массив объектов документа, содержащих метаданные и содержимое страницы',
                baseClasses: [...this.baseClasses, 'json']
            },
            {
                label: 'Текст',
                name: 'text',
                description: 'Объединенная строка из содержимого страниц документов',
                baseClasses: ['string', 'json']
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const filePath = nodeData.inputs?.filePath as string
        const unstructuredAPIUrl = nodeData.inputs?.unstructuredAPIUrl as string
        const strategy = nodeData.inputs?.strategy as UnstructuredLoaderStrategy
        const encoding = nodeData.inputs?.encoding as string
        const coordinates = nodeData.inputs?.coordinates as boolean
        const skipInferTableTypes = nodeData.inputs?.skipInferTableTypes
            ? JSON.parse(nodeData.inputs?.skipInferTableTypes as string)
            : ([] as SkipInferTableTypes[])
        const hiResModelName = nodeData.inputs?.hiResModelName as HiResModelName
        const includePageBreaks = nodeData.inputs?.includePageBreaks as boolean
        const chunkingStrategy = nodeData.inputs?.chunkingStrategy as string
        const metadata = nodeData.inputs?.metadata
        const sourceIdKey = (nodeData.inputs?.sourceIdKey as string) || 'source'
        const ocrLanguages = nodeData.inputs?.ocrLanguages ? JSON.parse(nodeData.inputs?.ocrLanguages as string) : ([] as string[])
        const xmlKeepTags = nodeData.inputs?.xmlKeepTags as boolean
        const multiPageSections = nodeData.inputs?.multiPageSections as boolean
        const combineUnderNChars = nodeData.inputs?.combineUnderNChars as string
        const newAfterNChars = nodeData.inputs?.newAfterNChars as string
        const maxCharacters = nodeData.inputs?.maxCharacters as string
        const _omitMetadataKeys = nodeData.inputs?.omitMetadataKeys as string
        const output = nodeData.outputs?.output as string

        let omitMetadataKeys: string[] = []
        if (_omitMetadataKeys) {
            omitMetadataKeys = _omitMetadataKeys.split(',').map((key) => key.trim())
        }
        // give priority to upload with upsert then to fileObject (upload from UI component)
        const fileBase64 =
            nodeData.inputs?.pdfFile ||
            nodeData.inputs?.txtFile ||
            nodeData.inputs?.yamlFile ||
            nodeData.inputs?.docxFile ||
            nodeData.inputs?.jsonlinesFile ||
            nodeData.inputs?.csvFile ||
            nodeData.inputs?.jsonFile ||
            (nodeData.inputs?.fileObject as string)

        const obj: UnstructuredLoaderOptions = {
            apiUrl: unstructuredAPIUrl,
            strategy,
            encoding,
            coordinates,
            skipInferTableTypes,
            hiResModelName,
            includePageBreaks,
            chunkingStrategy,
            ocrLanguages,
            xmlKeepTags,
            multiPageSections
        }

        if (combineUnderNChars) {
            obj.combineUnderNChars = parseInt(combineUnderNChars, 10)
        }

        if (newAfterNChars) {
            obj.newAfterNChars = parseInt(newAfterNChars, 10)
        }

        if (maxCharacters) {
            obj.maxCharacters = parseInt(maxCharacters, 10)
        }

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const unstructuredAPIKey = getCredentialParam('unstructuredAPIKey', credentialData, nodeData)
        if (unstructuredAPIKey) obj.apiKey = unstructuredAPIKey

        let docs: IDocument[] = []
        let files: string[] = []

        if (fileBase64) {
            const loader = new UnstructuredLoader(obj)
            //FILE-STORAGE::["CONTRIBUTING.md","LICENSE.md","README.md"]
            if (fileBase64.startsWith('FILE-STORAGE::')) {
                const fileName = fileBase64.replace('FILE-STORAGE::', '')
                if (fileName.startsWith('[') && fileName.endsWith(']')) {
                    files = JSON.parse(fileName)
                } else {
                    files = [fileName]
                }
                const orgId = options.orgId
                const chatflowid = options.chatflowid

                for (const file of files) {
                    if (!file) continue
                    const fileData = await getFileFromStorage(file, orgId, chatflowid)
                    const loaderDocs = await loader.loadAndSplitBuffer(fileData, file)
                    docs.push(...loaderDocs)
                }
            } else {
                if (fileBase64.startsWith('[') && fileBase64.endsWith(']')) {
                    files = JSON.parse(fileBase64)
                } else {
                    files = [fileBase64]
                }

                for (const file of files) {
                    if (!file) continue
                    const splitDataURI = file.split(',')
                    const filename = splitDataURI.pop()?.split(':')[1] ?? ''
                    const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
                    const loaderDocs = await loader.loadAndSplitBuffer(bf, filename)
                    docs.push(...loaderDocs)
                }
            }
        } else if (filePath) {
            const loader = new LCUnstructuredLoader(filePath, obj)
            const loaderDocs = await loader.load()
            docs.push(...loaderDocs)
        } else {
            throw new Error('Требуется путь к файлу или загрузка файла')
        }

        if (metadata) {
            const parsedMetadata = typeof metadata === 'object' ? metadata : JSON.parse(metadata)
            docs = docs.map((doc) => ({
                ...doc,
                metadata:
                    _omitMetadataKeys === '*'
                        ? {
                              ...parsedMetadata
                          }
                        : omit(
                              {
                                  ...doc.metadata,
                                  ...parsedMetadata,
                                  [sourceIdKey]: doc.metadata[sourceIdKey] || sourceIdKey
                              },
                              omitMetadataKeys
                          )
            }))
        } else {
            docs = docs.map((doc) => ({
                ...doc,
                metadata:
                    _omitMetadataKeys === '*'
                        ? {}
                        : omit(
                              {
                                  ...doc.metadata,
                                  [sourceIdKey]: doc.metadata[sourceIdKey] || sourceIdKey
                              },
                              omitMetadataKeys
                          )
            }))
        }

        if (output === 'document') {
            return docs
        } else {
            let finaltext = ''
            for (const doc of docs) {
                finaltext += `${doc.pageContent}\n`
            }
            return handleEscapeCharacters(finaltext, false)
        }
    }
}

module.exports = { nodeClass: UnstructuredFile_DocumentLoaders }
