import fs from 'fs/promises'
import axios from 'axios'
import cheerio from 'cheerio'

const outDir = `${__dirname}/out`

const galleryUrl = 'https://freakydeaky.com'

const gallerySelectors = {
    day1: '#day-1-photos',
    day2: '#day-2-photos',
}

const imageUrlPrefix = 'https://storage.googleapis.com/2023-freakydeaky-com/2023/11/'

const filenameFromUrlRegex = /^.*\/(.*?)$/

//

const exists = async (path: string): Promise<boolean> => {
    try {
        await fs.access(path)
        return true
    } catch {
        return false
    }
}

const ensureDirsExist = async (): Promise<void> => {
    await Promise.all(Object.keys(gallerySelectors).map(async key => {
        const path = `${outDir}/${key}`
        if (!await exists(path)) {
            await fs.mkdir(path, { recursive: true })
        }
    }))
}

const getFilenameFromUrl = (url: string): string => {
    return url.match(filenameFromUrlRegex)?.[1]!
}

const downloadImage = async (dir: string, url: string): Promise<void> => {
    const filename = getFilenameFromUrl(url)
    let path = `${dir}/${filename}`

    const { data } = await axios.get(url, { responseType: 'arraybuffer' })

    await fs.writeFile(path, data)
}

const downloadImages = async (galleryName: string, urls: string[]): Promise<void> => {
    const promises = urls.map(url => downloadImage(`${outDir}/${galleryName}`, url))
    await Promise.all(promises)
}

const main = async (): Promise<void> => {
    await ensureDirsExist()

    const response = await axios.get(galleryUrl)
    const html = response.data.toString()

    const $ = cheerio.load(html)

    const urlsByGallery: Record<string, string[]> = Object.entries(gallerySelectors).reduce((acc, [key, selector]) => {
        const urls = $('a', selector).toArray().map(elm => $(elm).attr('href')).filter(src => src?.startsWith(imageUrlPrefix))
        return { ...acc, [key]: urls }
    }, {})

    Object.entries(urlsByGallery).forEach(([key, urls]) => console.log(`${key}: ${urls.length}`))

    const promises = Object.entries(urlsByGallery).map(([key, urls]) => downloadImages(key, urls))
    await Promise.all(promises)
}

main()
