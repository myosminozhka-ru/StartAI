import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { S3Loader } from '@langchain/community/document_loaders/web/s3'
import {
    UnstructuredLoader,
    UnstructuredLoaderOptions,
    UnstructuredLoaderStrategy,
    SkipInferTableTypes,
    HiResModelName
} from '@langchain/community/document_loaders/fs/unstructured'
import {
    getCredentialData,
    getCredentialParam,
    handleDocumentLoaderDocuments,
    handleDocumentLoaderMetadata,
    handleDocumentLoaderOutput
} from '../../../src/utils'
import { S3Client, GetObjectCommand, S3ClientConfig } from '@aws-sdk/client-s3'
import { getRegions, MODEL_TYPE } from '../../../src/modelLoader'
import { Readable } from 'node:stream'
import * as fsDefault from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'

class S3_DocumentLoaders implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    credential: INodeParams
    inputs?: INodeParams[]
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'S3'
        this.name = 'S3'
        this.version = 4.0
        this.type = 'Document'
        this.icon = 's3.svg'
        this.category = 'Document Loaders'
        this.description = 'Загрузка данных из S3 бакетов'
        this.baseClasses = [this.type]
        this.credential = {
            label: 'Учетные данные AWS',
            name: 'credential',
            type: 'credential',
            credentialNames: ['awsApi'],
            optional: true
        }
        this.inputs = [
            {
                label: 'Бакет',
                name: 'bucketName',
                type: 'string'
            },
            {
                label: 'Ключ объекта',
                name: 'keyName',
                type: 'string',
                description: 'Ключ объекта (или имя ключа), который уникально идентифицирует объект в бакете Amazon S3',
                placeholder: 'AI-Paper.pdf'
            },
            {
                label: 'Регион',
                name: 'region',
                type: 'asyncOptions',
                loadMethod: 'listRegions',
                default: 'us-east-1'
            },
            {
                label: 'URL API Unstructured',
                name: 'unstructuredAPIUrl',
                description:
                    'Ваш URL Unstructured.io. Прочитайте <a target="_blank" href="https://unstructured-io.github.io/unstructured/introduction.html#getting-started">подробнее</a> о том, как начать работу',
                type: 'string',
                placeholder: process.env.UNSTRUCTURED_API_URL || 'http://localhost:8000/general/v0/general',
                optional: !!process.env.UNSTRUCTURED_API_URL
            },
            {
                label: 'Ключ API Unstructured',
                name: 'unstructuredAPIKey',
                type: 'password',
                optional: true
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
                description: 'Типы документов, для которых вы хотите пропустить извлечение таблиц. По умолчанию: pdf, jpg, png.',
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
                            'Эксклюзивно для Unstructured hosted API. Модель Chipper - это внутренняя модель преобразования изображения в текст Unstructured, основанная на моделях Visual Document Understanding (VDU) на базе трансформеров.'
                    },
                    {
                        label: 'detectron2_onnx',
                        name: 'detectron2_onnx',
                        description:
                            'Модель компьютерного зрения от Facebook AI, которая предоставляет алгоритмы обнаружения и сегментации объектов с ONNX Runtime. Это самая быстрая модель со стратегией hi_res.'
                    },
                    {
                        label: 'yolox',
                        name: 'yolox',
                        description: 'Детектор объектов в реальном времени в один этап, который модифицирует YOLOv3 с бэкбоном DarkNet53.'
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
                label: 'Стратегия разбиения',
                name: 'chunkingStrategy',
                description:
                    'Используйте одну из поддерживаемых стратегий для разбиения возвращаемых элементов. Если опущено, разбиение не выполняется, и любые другие предоставленные параметры разбиения игнорируются. По умолчанию: by_title',
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
                        label: 'Английский',
                        name: 'eng'
                    },
                    {
                        label: 'Испанский (Español)',
                        name: 'spa'
                    },
                    {
                        label: 'Китайский (普通话)',
                        name: 'cmn'
                    },
                    {
                        label: 'Хинди (हिन्दी)',
                        name: 'hin'
                    },
                    {
                        label: 'Арабский (اَلْعَرَبِيَّةُ)',
                        name: 'ara'
                    },
                    {
                        label: 'Португальский (Português)',
                        name: 'por'
                    },
                    {
                        label: 'Бенгальский (বাংলা)',
                        name: 'ben'
                    },
                    {
                        label: 'Русский (Русский)',
                        name: 'rus'
                    },
                    {
                        label: 'Японский (日本語)',
                        name: 'jpn'
                    },
                    {
                        label: 'Панджаби (ਪੰਜਾਬੀ)',
                        name: 'pan'
                    },
                    {
                        label: 'Немецкий (Deutsch)',
                        name: 'deu'
                    },
                    {
                        label: 'Корейский (한국어)',
                        name: 'kor'
                    },
                    {
                        label: 'Французский (Français)',
                        name: 'fra'
                    },
                    {
                        label: 'Итальянский (Italiano)',
                        name: 'ita'
                    },
                    {
                        label: 'Вьетнамский (Tiếng Việt)',
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
                description: 'Когда true, вывод будет включать элементы разрыва страницы, когда тип файла это поддерживает.',
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
                    'Если установлена стратегия разбиения, объединять элементы, пока раздел не достигнет длины n символов. По умолчанию: значение max_characters. Не может превышать значение max_characters.',
                type: 'number',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Новый после N символов',
                name: 'newAfterNChars',
                description:
                    'Если установлена стратегия разбиения, обрезать новые разделы после достижения длины n символов (мягкий максимум). Значение max_characters. Не может превышать значение max_characters.',
                type: 'number',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Максимум символов',
                name: 'maxCharacters',
                description:
                    'Если установлена стратегия разбиения, обрезать новые разделы после достижения длины n символов (жесткий максимум). По умолчанию: 500',
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
                    'Каждый загрузчик документов поставляется с набором метаданных по умолчанию, которые извлекаются из документа. Вы можете использовать это поле для исключения некоторых ключей метаданных по умолчанию. Значение должно быть списком ключей, разделенных запятыми. Используйте * для исключения всех ключей метаданных, кроме тех, которые вы указали в поле Дополнительные метаданные',
                placeholder: 'key1, key2, key3.nestedKey1',
                optional: true,
                additionalParams: true
            }
        ]
        this.outputs = [
            {
                label: 'Документ',
                name: 'document',
                description: 'Массив объектов документов, содержащих метаданные и содержимое страницы',
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

    loadMethods = {
        async listRegions(): Promise<INodeOptionsValue[]> {
            return await getRegions(MODEL_TYPE.CHAT, 'awsChatBedrock')
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const bucketName = nodeData.inputs?.bucketName as string
        const keyName = nodeData.inputs?.keyName as string
        const region = nodeData.inputs?.region as string
        const unstructuredAPIUrl = nodeData.inputs?.unstructuredAPIUrl as string
        const unstructuredAPIKey = nodeData.inputs?.unstructuredAPIKey as string
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

        let credentials: S3ClientConfig['credentials'] | undefined

        if (nodeData.credential) {
            const credentialData = await getCredentialData(nodeData.credential, options)
            const accessKeyId = getCredentialParam('awsKey', credentialData, nodeData)
            const secretAccessKey = getCredentialParam('awsSecret', credentialData, nodeData)

            if (accessKeyId && secretAccessKey) {
                credentials = {
                    accessKeyId,
                    secretAccessKey
                }
            }
        }

        const s3Config: S3ClientConfig = {
            region,
            credentials
        }

        const loader = new S3Loader({
            bucket: bucketName,
            key: keyName,
            s3Config,
            unstructuredAPIURL: unstructuredAPIUrl,
            unstructuredAPIKey: unstructuredAPIKey
        })

        loader.load = async () => {
            const tempDir = fsDefault.mkdtempSync(path.join(os.tmpdir(), 's3fileloader-'))

            const filePath = path.join(tempDir, keyName)

            try {
                const s3Client = new S3Client(s3Config)

                const getObjectCommand = new GetObjectCommand({
                    Bucket: bucketName,
                    Key: keyName
                })

                const response = await s3Client.send(getObjectCommand)

                const objectData = await new Promise<Buffer>((resolve, reject) => {
                    const chunks: Buffer[] = []

                    if (response.Body instanceof Readable) {
                        response.Body.on('data', (chunk: Buffer) => chunks.push(chunk))
                        response.Body.on('end', () => resolve(Buffer.concat(chunks)))
                        response.Body.on('error', reject)
                    } else {
                        reject(new Error('Response body is not a readable stream.'))
                    }
                })

                fsDefault.mkdirSync(path.dirname(filePath), { recursive: true })

                fsDefault.writeFileSync(filePath, objectData)
            } catch (e: any) {
                throw new Error(`Failed to download file ${keyName} from S3 bucket ${bucketName}: ${e.message}`)
            }

            try {
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

                if (unstructuredAPIKey) obj.apiKey = unstructuredAPIKey

                const unstructuredLoader = new UnstructuredLoader(filePath, obj)

                let docs = await handleDocumentLoaderDocuments(unstructuredLoader)

                docs = handleDocumentLoaderMetadata(docs, _omitMetadataKeys, metadata, sourceIdKey)

                return handleDocumentLoaderOutput(docs, output)
            } catch {
                throw new Error(`Failed to load file ${filePath} using unstructured loader.`)
            } finally {
                fsDefault.rmSync(path.dirname(filePath), { recursive: true })
            }
        }

        return loader.load()
    }
}
module.exports = { nodeClass: S3_DocumentLoaders }
