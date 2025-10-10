import { omit } from 'lodash'
import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import {
    UnstructuredDirectoryLoader,
    UnstructuredLoaderOptions,
    UnstructuredLoaderStrategy,
    SkipInferTableTypes,
    HiResModelName
} from '@langchain/community/document_loaders/fs/unstructured'
import { getCredentialData, getCredentialParam, handleEscapeCharacters } from '../../../src/utils'

class UnstructuredFolder_DocumentLoaders implements INode {
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
        this.label = 'Загрузчик папок Unstructured'
        this.name = 'unstructuredFolderLoader'
        this.version = 3.0
        this.type = 'Document'
        this.icon = 'unstructured-folder.svg'
        this.category = 'Document Loaders'
        this.description =
            'Использовать Unstructured.io для загрузки данных из папки. Примечание: В настоящее время не поддерживает .png и .heic до обновления unstructured.'
        this.baseClasses = [this.type]
        this.credential = {
            label: 'Подключите учетные данные',
            name: 'credential',
            type: 'credential',
            credentialNames: ['unstructuredApi'],
            optional: true
        }
        this.inputs = [
            {
                label: 'Путь к папке',
                name: 'folderPath',
                type: 'string',
                placeholder: ''
            },
            {
                label: 'URL API Unstructured',
                name: 'unstructuredAPIUrl',
                description:
                    'URL API Unstructured. Подробнее о том, как начать работу, читайте <a target="_blank" href="https://unstructured-io.github.io/unstructured/introduction.html#getting-started">здесь</a>',
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
                description: 'Название модели вывода, используемой при стратегии hi_res. По умолчанию: detectron2_onnx.',
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
                additionalParams: true,
                default: 'detectron2_onnx'
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
                        label: 'По заголовку',
                        name: 'by_title'
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
                label: 'Включать разрывы страниц',
                name: 'includePageBreaks',
                description: 'Когда true, вывод будет включать элементы разрыва страниц, если тип файла это поддерживает.',
                type: 'boolean',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Сохранять XML теги',
                name: 'xmlKeepTags',
                description: 'Сохранять ли XML теги в выводе.',
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
        const folderPath = nodeData.inputs?.folderPath as string
        const unstructuredAPIUrl = nodeData.inputs?.unstructuredAPIUrl as string
        const strategy = nodeData.inputs?.strategy as UnstructuredLoaderStrategy
        const encoding = nodeData.inputs?.encoding as string
        const coordinates = nodeData.inputs?.coordinates as boolean
        const skipInferTableTypes = nodeData.inputs?.skipInferTableTypes
            ? JSON.parse(nodeData.inputs?.skipInferTableTypes as string)
            : ([] as SkipInferTableTypes[])
        const hiResModelName = nodeData.inputs?.hiResModelName as HiResModelName
        const includePageBreaks = nodeData.inputs?.includePageBreaks as boolean
        const chunkingStrategy = nodeData.inputs?.chunkingStrategy as 'None' | 'by_title'
        const metadata = nodeData.inputs?.metadata
        const sourceIdKey = (nodeData.inputs?.sourceIdKey as string) || 'source'
        const ocrLanguages = nodeData.inputs?.ocrLanguages ? JSON.parse(nodeData.inputs?.ocrLanguages as string) : ([] as string[])
        const xmlKeepTags = nodeData.inputs?.xmlKeepTags as boolean
        const multiPageSections = nodeData.inputs?.multiPageSections as boolean
        const combineUnderNChars = nodeData.inputs?.combineUnderNChars as number
        const newAfterNChars = nodeData.inputs?.newAfterNChars as number
        const maxCharacters = nodeData.inputs?.maxCharacters as number
        const _omitMetadataKeys = nodeData.inputs?.omitMetadataKeys as string
        const output = nodeData.outputs?.output as string

        let omitMetadataKeys: string[] = []
        if (_omitMetadataKeys) {
            omitMetadataKeys = _omitMetadataKeys.split(',').map((key) => key.trim())
        }

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
            multiPageSections,
            combineUnderNChars,
            newAfterNChars,
            maxCharacters
        }

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const unstructuredAPIKey = getCredentialParam('unstructuredAPIKey', credentialData, nodeData)
        if (unstructuredAPIKey) obj.apiKey = unstructuredAPIKey

        const loader = new UnstructuredDirectoryLoader(folderPath, obj)
        let docs = await loader.load()

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

module.exports = { nodeClass: UnstructuredFolder_DocumentLoaders }
