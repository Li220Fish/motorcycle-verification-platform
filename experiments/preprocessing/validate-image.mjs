import { buildChart, degrade, toGray, laplacianVariance, basicStats, ssim, psnr, sharp, CHART } from './lib-image.mjs'
let fail=0
const check=(n,p,d)=>{console.log(`${p?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);if(!p)fail++}

const chart = await buildChart()
await sharp(chart).resize(900).jpeg({quality:88}).toFile('chart-preview.jpg')
const g = await toGray(chart)
check('Chart built at capture resolution', g.width===CHART.width && g.height===CHART.height, `${g.width}x${g.height}`)

// identical images: SSIM 1, PSNR inf
check('SSIM of an image with itself is 1', Math.abs(ssim(g,g)-1)<1e-6, ssim(g,g).toFixed(6))
check('PSNR of an image with itself is infinite', psnr(g,g)===Infinity)

// blur must lower Laplacian variance a lot
const blurG = await toGray(await degrade(chart,'blur'))
const lapClean = laplacianVariance(g), lapBlur = laplacianVariance(blurG)
check('Blur sharply reduces Laplacian variance', lapBlur < lapClean/10,
  `clean ${lapClean.toFixed(0)} → blurred ${lapBlur.toFixed(1)}`)

// glare must raise clipped-highlight percentage
const glareG = await toGray(await degrade(chart,'glare'))
const sClean = basicStats(g), sGlare = basicStats(glareG)
check('Glare raises the clipped-highlight share', sGlare.clippedHighlightPct > sClean.clippedHighlightPct + 1,
  `${sClean.clippedHighlightPct}% → ${sGlare.clippedHighlightPct}%`)

// low light must drop mean luma and contrast
const lowG = await toGray(await degrade(chart,'lowlight'))
const sLow = basicStats(lowG)
check('Low light drops mean luminance', sLow.meanLuma < sClean.meanLuma/2,
  `${sClean.meanLuma} → ${sLow.meanLuma}`)

// SSIM must fall for a degraded copy
check('SSIM falls for a degraded copy', ssim(g,blurG) < 0.95, `blur SSIM ${ssim(g,blurG).toFixed(3)} (chart is mostly flat panel, so global SSIM stays highish)`)

console.log(`\n${fail? fail+' FAILED':'ALL IMAGE CHECKS PASSED'}`)
process.exit(fail?1:0)
