const inputText = `HTL Network 
Omprakash Vishwakarma S/O Ramnarayan Vishwakarma 
City- W.No-04,Bajrang Mohalla,Surajpur Nake ke Pass,Behrasia Road
tehsil Narsingh Garh 
District- Rajgarh 
Pincode- 465669 
State- Madhya Pradesh 
mobile 9993192017
Applier Name- Omprakash Vishwakarma 

RJ

HTL Network 
Veer Bhan Singh S/O Omprakash 
City- Vill - Ruriya
tehsil Ghiror 
District- Mainpuri 
Pincode- 205130 
State- Uttar Pradesh 
m.no- 9993192017
Applier Name- Omprakash 

UP`;

const formatSingleBlock = (blockText) => {
  const lines = blockText.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return "";

  let applicantName = '';
  let fatherName = '';
  let cityVillage = '';
  let tehsil = '';
  let district = '';
  let pincode = '';
  let state = '';
  let mobile = '';
  let applierName = '';
  let tag = '';

  // Identify tag (if the last line is a short code, e.g. 2-4 characters)
  if (lines.length > 0) {
    const lastLine = lines[lines.length - 1];
    if (lastLine.length <= 4 && !lastLine.includes('-') && !lastLine.includes(':')) {
      tag = lastLine.toUpperCase();
      lines.pop(); // Remove it from lines to process
    }
  }

  for (let line of lines) {
    const upperLine = line.toUpperCase();
    
    // Check for S/O line
    if (upperLine.includes(' S/O ') || upperLine.includes(' S/O')) {
      const parts = line.split(/\s+s\/o\s*/i);
      if (parts.length >= 2) {
        applicantName = parts[0].trim();
        fatherName = parts[1].trim();
      } else {
        applicantName = line.trim();
      }
      continue;
    }

    const lowerLine = line.toLowerCase();

    // Check for fields using regular expressions for maximum flexibility
    const cityMatch = line.match(/^(?:city|village|vill)(?:age)?[-:\s]*(.*)/i) || (lowerLine.includes('bajrang mohalla') ? [line, line] : null);
    const tehsilMatch = line.match(/(?:tehsil|tahsil)[-:\s]*(.*)/i);
    const distMatch = line.match(/(?:district|distt|dist)[-:\s]*(.*)/i);
    const pinMatch = line.match(/(?:pincode|pin\s*code|pin)[-:\s]*(.*)/i);
    const stateMatch = line.match(/(?:state)[-:\s]*(.*)/i);
    const mobileMatch = line.match(/(?:m\.?\s*no\.?|mob(?:ile)?(?:\s*no\.?)?(?:\s*number)?|contact|phone|ph)[-:\s]+(.*)/i) || line.match(/^(?:m\.?\s*no\.?|mob(?:ile)?(?:\s*no\.?)?(?:\s*number)?|contact|phone|ph)\s*(.*)/i);
    const applierMatch = line.match(/(?:applier\s*name|applicant\s*name|applier|applicant)[-:\s]*(.*)/i);

    if (cityMatch) {
      cityVillage = cityMatch[1].trim();
    } else if (tehsilMatch) {
      tehsil = tehsilMatch[1].trim();
    } else if (distMatch) {
      district = distMatch[1].trim();
    } else if (pinMatch) {
      pincode = pinMatch[1].trim();
    } else if (stateMatch) {
      state = stateMatch[1].trim();
    } else if (mobileMatch) {
      mobile = mobileMatch[1].trim();
    } else if (applierMatch) {
      applierName = applierMatch[1].trim();
    }
  }

  // Clean names helper
  const cleanName = (n) => {
    let cleaned = n.replace(/^(mr\.|mrs\.|ms\.)\s+/i, '').trim();
    return cleaned.toUpperCase();
  };

  const formattedApplicant = applicantName ? `MR. ${cleanName(applicantName)}` : '';
  const formattedFather = fatherName ? `MR. ${cleanName(fatherName)}` : '';
  const formattedApplier = applierName ? `MR. ${cleanName(applierName)}` : '';

  // Get state code
  const stateClean = state.toLowerCase();
  let stateCode = '';
  const stateCodes = {
    "madhya pradesh": "MP", "uttar pradesh": "UP", "rajasthan": "RJ", "bihar": "BR",
    "haryana": "HR", "punjab": "PB", "delhi": "DL", "gujarat": "GJ", "maharashtra": "MH",
    "west bengal": "WB", "tamil nadu": "TN", "karnataka": "KA", "andhra pradesh": "AP",
    "telangana": "TS", "chhattisgarh": "CG", "jharkhand": "JH", "odisha": "OD",
    "uttarakhand": "UK", "himachal pradesh": "HP", "jammu and kashmir": "JK"
  };
  if (stateClean) {
    stateCode = stateCodes[stateClean] || state.toUpperCase();
  }

  // Build the first line
  let firstLineParts = [];
  if (formattedApplicant) {
    if (formattedFather) {
      firstLineParts.push(`${formattedApplicant} S/O ${formattedFather}`);
    } else {
      firstLineParts.push(formattedApplicant);
    }
  }
  if (cityVillage) {
    let displayCity = cityVillage.toUpperCase();
    firstLineParts.push(`VILL - ${displayCity}`);
  }
  if (tehsil) {
    firstLineParts.push(`TEHSIL - ${tehsil.toUpperCase()}`);
  }
  if (district) {
    const stateSuffix = stateCode ? ` (${stateCode})` : '';
    const pinSuffix = pincode ? ` - ${pincode}` : '';
    firstLineParts.push(`DISTT - ${district.toUpperCase()}${stateSuffix}${pinSuffix}`);
  }

  const firstLine = firstLineParts.join(', ');
  const secondLine = `MOBILE NO - ${mobile}`;
  const thirdLine = `APPLIER NAME - ${formattedApplier}${tag ? ` (${tag})` : ''}`;

  return `${firstLine}\n${secondLine}\n${thirdLine}`;
};

const formatText = (inputText) => {
  let rawBlocks = [];
  if (inputText.includes("---") || inputText.includes("===")) {
    rawBlocks = inputText.split(/\n\s*(?:---+|===+)\s*\n/);
  } else {
    const lines = inputText.split("\n");
    let currentBlock = [];
    for (let line of lines) {
      const trimmed = line.trim();
      const upperTrimmed = trimmed.toUpperCase();
      if ((upperTrimmed.startsWith("HTL") || upperTrimmed.startsWith("NETWORK")) && currentBlock.length > 0) {
        rawBlocks.push(currentBlock.join("\n"));
        currentBlock = [];
      }
      currentBlock.push(line);
    }
    if (currentBlock.length > 0) {
      rawBlocks.push(currentBlock.join("\n"));
    }
  }

  rawBlocks = rawBlocks.map(b => b.trim()).filter(Boolean);

  const outputs = rawBlocks.map(block => {
    const formatted = formatSingleBlock(block);
    return `${block}\n--------------------\n${formatted}`;
  });

  return outputs.join("\n\n====================\n\n");
};

console.log(formatText(inputText));
