// Parsed incident data from Law Enforcement Dispatched Calls CSV
import { Incident } from '../services/SafetyDataService'

// Parse real dispatch data from CSV
const csvIncidents = [
  { datetime: "2025/10/26 08:56:38 AM", notes: "", lat: 37.776161979, lng: -122.405476063 },
  { datetime: "2025/10/26 08:54:46 AM", notes: "UNREPORTED", lat: 37.720033302, lng: -122.456133498 },
  { datetime: "2025/10/26 08:52:33 AM", notes: "", lat: 37.757120851, lng: -122.401832507 },
  { datetime: "2025/10/26 08:49:14 AM", notes: "601", lat: 37.800190186, lng: -122.441177376 },
  { datetime: "2025/10/26 08:48:41 AM", notes: "", lat: 37.807072514, lng: -122.417260631 },
  { datetime: "2025/10/26 08:47:22 AM", notes: "", lat: 37.783259236, lng: -122.402708154 },
  { datetime: "2025/10/26 08:41:33 AM", notes: "", lat: 37.768273653, lng: -122.419981512 },
  { datetime: "2025/10/26 08:36:36 AM", notes: "", lat: 37.781754328, lng: -122.409693262 },
  { datetime: "2025/10/26 08:36:11 AM", notes: "", lat: 37.75989352, lng: -122.424863197 },
  { datetime: "2025/10/26 08:35:47 AM", notes: "SOB", lat: 37.80634343, lng: -122.41543157 },
  { datetime: "2025/10/26 08:34:43 AM", notes: "", lat: 37.789369268, lng: -122.39185829 },
  { datetime: "2025/10/26 08:34:04 AM", notes: "", lat: 37.796481303, lng: -122.425249875 },
  { datetime: "2025/10/26 08:34:03 AM", notes: "", lat: 37.753011531, lng: -122.504333368 },
  { datetime: "2025/10/26 08:32:59 AM", notes: "22500E", lat: 37.765830028, lng: -122.468582999 },
  { datetime: "2025/10/26 08:30:33 AM", notes: "", lat: 37.807275871, lng: -122.415616436 },
  { datetime: "2025/10/26 08:29:49 AM", notes: "", lat: 37.764427172, lng: -122.408423987 },
  { datetime: "2025/10/26 08:25:23 AM", notes: "", lat: 37.714307653, lng: -122.46260204 },
  { datetime: "2025/10/26 08:23:33 AM", notes: "", lat: 37.784866246, lng: -122.412782128 },
  { datetime: "2025/10/26 08:23:10 AM", notes: "", lat: 37.723479487, lng: -122.437161834 },
  { datetime: "2025/10/26 08:20:22 AM", notes: "", lat: 37.764754943, lng: -122.424574376 },
  { datetime: "2025/10/26 08:10:10 AM", notes: "", lat: 37.782073068, lng: -122.412220736 },
  { datetime: "2025/10/26 08:09:16 AM", notes: "", lat: 37.75989352, lng: -122.424863197 },
  { datetime: "2025/10/26 08:09:07 AM", notes: "", lat: 37.77999174, lng: -122.413487399 },
  { datetime: "2025/10/26 08:07:29 AM", notes: "909", lat: 37.780162026, lng: -122.407691415 },
  { datetime: "2025/10/26 08:06:14 AM", notes: "", lat: 37.785582475, lng: -122.414617208 },
  { datetime: "2025/10/26 08:05:50 AM", notes: "", lat: 37.759643042, lng: -122.481147524 },
  { datetime: "2025/10/26 08:05:47 AM", notes: "", lat: 37.781598822, lng: -122.454175993 },
  { datetime: "2025/10/26 08:04:39 AM", notes: "BULLET CASING", lat: 37.737514216, lng: -122.384046509 },
  { datetime: "2025/10/26 08:04:12 AM", notes: "AGGRESSIVE", lat: 37.764507613, lng: -122.428665129 },
  { datetime: "2025/10/26 08:03:45 AM", notes: "", lat: 37.74239025, lng: -122.490692042 },
  { datetime: "2025/10/26 08:03:42 AM", notes: "", lat: 37.823174923, lng: -122.374906701 },
  { datetime: "2025/10/26 08:00:46 AM", notes: "", lat: 37.757297644, lng: -122.414541468 },
  { datetime: "2025/10/26 07:58:08 AM", notes: "", lat: 37.739275902, lng: -122.400246409 },
  { datetime: "2025/10/26 07:56:51 AM", notes: "22500E", lat: 37.779042581, lng: -122.465210661 },
  { datetime: "2025/10/26 07:52:53 AM", notes: "", lat: 37.78724521, lng: -122.416638697 },
  { datetime: "2025/10/26 07:52:39 AM", notes: "", lat: 37.772829248, lng: -122.43228011 },
  { datetime: "2025/10/26 07:51:06 AM", notes: "DRUGS", lat: 37.783515641, lng: -122.415882538 },
  { datetime: "2025/10/26 07:50:01 AM", notes: "", lat: 37.785829214, lng: -122.401489835 },
  { datetime: "2025/10/26 07:49:48 AM", notes: "", lat: 37.765002197, lng: -122.420482492 },
  { datetime: "2025/10/26 07:45:57 AM", notes: "", lat: 37.726363516, lng: -122.380817112 },
  { datetime: "2025/10/26 07:44:26 AM", notes: "", lat: 37.765109955, lng: -122.418698426 },
  { datetime: "2025/10/26 07:42:45 AM", notes: "", lat: 37.789412062, lng: -122.422135208 },
  { datetime: "2025/10/26 07:42:38 AM", notes: "22500E", lat: 37.801016784, lng: -122.439598337 },
  { datetime: "2025/10/26 07:40:57 AM", notes: "", lat: 37.743351789, lng: -122.406710926 },
  { datetime: "2025/10/26 07:39:08 AM", notes: "", lat: 37.785829214, lng: -122.401489835 },
  { datetime: "2025/10/26 07:36:45 AM", notes: "DRUGS", lat: 37.784773614, lng: -122.388023344 },
  { datetime: "2025/10/26 07:35:55 AM", notes: "", lat: 37.782230575, lng: -122.410292027 },
  { datetime: "2025/10/26 07:35:30 AM", notes: "7.2.45", lat: 37.804354925, lng: -122.423466053 },
  { datetime: "2025/10/26 07:34:36 AM", notes: "DRUG PICKUP", lat: 37.782885336, lng: -122.4427931 },
  { datetime: "2025/10/26 07:33:14 AM", notes: "22654E", lat: 37.734762793, lng: -122.414312671 },
  { datetime: "2025/10/26 07:31:36 AM", notes: "", lat: 37.714904673, lng: -122.456071999 },
  { datetime: "2025/10/26 07:30:25 AM", notes: "", lat: 37.768770499, lng: -122.427462058 },
  { datetime: "2025/10/26 07:27:07 AM", notes: "MUNI", lat: 37.782230575, lng: -122.410292027 },
  { datetime: "2025/10/26 07:25:07 AM", notes: "", lat: 37.798429702, lng: -122.40222864 },
  { datetime: "2025/10/26 07:22:51 AM", notes: "", lat: 37.765924663, lng: -122.46644249 },
  { datetime: "2025/10/26 07:21:57 AM", notes: "", lat: 37.785789585, lng: -122.412969667 },
  { datetime: "2025/10/26 07:21:09 AM", notes: "601", lat: 37.723457007, lng: -122.454115753 },
  { datetime: "2025/10/26 07:20:28 AM", notes: "", lat: 37.769734696, lng: -122.424581089 },
  { datetime: "2025/10/26 07:19:36 AM", notes: "500E", lat: 37.725965421, lng: -122.439617477 },
  { datetime: "2025/10/26 07:18:40 AM", notes: "R/O", lat: 37.775602763, lng: -122.403076401 },
  { datetime: "2025/10/26 07:16:19 AM", notes: "", lat: 37.803962802, lng: -122.440194928 },
  { datetime: "2025/10/26 07:15:27 AM", notes: "AT RISK", lat: 37.782056939, lng: -122.427396397 },
  { datetime: "2025/10/26 07:12:45 AM", notes: "601", lat: 37.730118806, lng: -122.475937334 },
  { datetime: "2025/10/26 07:12:29 AM", notes: "", lat: 37.758653333, lng: -122.503652481 },
  { datetime: "2025/10/26 07:11:28 AM", notes: "", lat: 37.76413087, lng: -122.464172023 },
  { datetime: "2025/10/26 07:10:17 AM", notes: "", lat: 37.785582475, lng: -122.414617208 },
  { datetime: "2025/10/26 07:03:30 AM", notes: "", lat: 37.711592688, lng: -122.45246692 },
  { datetime: "2025/10/26 07:03:10 AM", notes: "", lat: 37.783259236, lng: -122.402708154 },
  { datetime: "2025/10/26 06:58:33 AM", notes: "500E", lat: 37.792552337, lng: -122.412649657 },
  { datetime: "2025/10/26 06:53:48 AM", notes: "", lat: 37.7122644, lng: -122.429698599 },
  { datetime: "2025/10/26 06:53:14 AM", notes: "", lat: 37.787568025, lng: -122.406589883 },
  { datetime: "2025/10/26 06:51:57 AM", notes: "", lat: 37.788222701, lng: -122.420210435 },
  { datetime: "2025/10/26 06:51:52 AM", notes: "DPW", lat: 37.775147074, lng: -122.419255606 },
  { datetime: "2025/10/26 06:49:57 AM", notes: "", lat: 37.763571604, lng: -122.417332406 },
  { datetime: "2025/10/26 06:49:12 AM", notes: "", lat: 37.782056939, lng: -122.427396397 },
  { datetime: "2025/10/26 06:43:18 AM", notes: "", lat: 37.761699375, lng: -122.477010887 },
  { datetime: "2025/10/26 06:42:38 AM", notes: "", lat: 37.763559498, lng: -122.477174111 },
]

// Convert CSV data to Incident format
export const parsedMockIncidents: Incident[] = csvIncidents.map((item, index) => {
  // Determine incident type and severity based on notes
  let type: Incident['type'] = 'suspicious'
  let severity: Incident['severity'] = 'low'
  let description = 'Police Dispatch Call'
  
  if (item.notes) {
    const notes = item.notes.toUpperCase()
    
    if (notes.includes('AGGRESSIVE')) {
      type = 'aggressive'
      severity = 'high'
      description = 'Aggressive Behavior Report'
    } else if (notes.includes('BULLET') || notes.includes('SHOOTING')) {
      type = 'crime'
      severity = 'high'
      description = 'Weapons-Related Incident'
    } else if (notes.includes('DRUG')) {
      type = 'crime'
      severity = 'medium'
      description = 'Drug-Related Activity'
    } else if (notes.includes('601') || notes.includes('909')) {
      type = 'crime'
      severity = 'medium'
      description = `Police Code ${notes}`
    } else if (notes.includes('AT RISK')) {
      type = 'suspicious'
      severity = 'medium'
      description = 'At-Risk Individual'
    } else if (notes.includes('SOB')) {
      type = 'suspicious'
      severity = 'low'
      description = 'Suspicious Observation'
    } else if (notes.includes('22500') || notes.includes('22654')) {
      type = 'crime'
      severity = 'low'
      description = `Traffic Violation ${notes}`
    } else if (notes.includes('DPW') || notes.includes('MUNI')) {
      type = 'suspicious'
      severity = 'low'
      description = `City Service Issue: ${notes}`
    } else if (notes.includes('500E') || notes.includes('811')) {
      type = 'crime'
      severity = 'medium'
      description = `Police Code ${notes}`
    }
    
    if (notes) {
      description += ` (${notes})`
    }
  }
  
  return {
    id: `dispatch_${index + 1}`,
    type,
    severity,
    location: {
      lat: item.lat,
      lng: item.lng
    },
    datetime: new Date(item.datetime),
    description,
    status: 'Active'
  }
})

// Also include some static encampment reports for variety
const staticEncampments: Incident[] = [
  { id: 'enc_1', type: 'encampment', severity: 'high', location: { lat: 37.7835, lng: -122.4144 }, datetime: new Date(), description: '311: Large Encampment - Tenderloin', status: 'Open' },
  { id: 'enc_2', type: 'encampment', severity: 'medium', location: { lat: 37.7583, lng: -122.4180 }, datetime: new Date(), description: '311: Tent on Sidewalk - Mission', status: 'Open' },
  { id: 'enc_3', type: 'encampment', severity: 'high', location: { lat: 37.7793, lng: -122.4187 }, datetime: new Date(), description: '311: Multiple Tents - Civic Center', status: 'Open' },
  { id: 'enc_4', type: 'encampment', severity: 'medium', location: { lat: 37.7765, lng: -122.4089 }, datetime: new Date(), description: '311: Encampment Under Overpass - SOMA', status: 'Open' },
  { id: 'enc_5', type: 'encampment', severity: 'medium', location: { lat: 37.7699, lng: -122.4469 }, datetime: new Date(), description: '311: Encampment in Park - Haight', status: 'Open' },
  { id: 'enc_6', type: 'encampment', severity: 'low', location: { lat: 37.7315, lng: -122.3955 }, datetime: new Date(), description: '311: Small Camp - Bayview', status: 'Open' },
  { id: 'enc_7', type: 'encampment', severity: 'high', location: { lat: 37.7755, lng: -122.4186 }, datetime: new Date(), description: '311: Large Tent City - Mid-Market', status: 'Open' },
  { id: 'enc_8', type: 'encampment', severity: 'medium', location: { lat: 37.7725, lng: -122.4315 }, datetime: new Date(), description: '311: Sidewalk Blocked - Hayes Valley', status: 'Open' },
]

// Combine all incidents
export const allMockIncidents: Incident[] = [
  ...parsedMockIncidents,
  ...staticEncampments
]