package com.bcsccore.storage

// A helper object to keep the environment mapping usable across multiple modules
object IssuerEnvironmentMap {
    const val DEFAULT_ISSUER = "prod"

    val issuerUrlToName: Map<String, String> =
        linkedMapOf(
            "https://id.gov.bc.ca/device/" to "prod",
            "https://idsit.gov.bc.ca/device/" to "sit",
            "https://idqa.gov.bc.ca/device/" to "qa",
            "https://iddev.gov.bc.ca/device/" to "dev",
            "https://iddev2.gov.bc.ca/device/" to "dev2",
            "https://idpreprod.gov.bc.ca/device/" to "preprod",
            "https://idtest.gov.bc.ca/device/" to "test",
        )

    val issuerNameToUrl: Map<String, String> =
        issuerUrlToName.entries.associate { (url, name) -> name to url }

    val issuerNamesInPriorityOrder: List<String> =
        listOf(DEFAULT_ISSUER) +
            issuerNameToUrl.keys
                .filter { it != DEFAULT_ISSUER }
                .sorted()

    fun getIssuerNameFromUrl(issuerUrl: String): String? = issuerUrlToName[issuerUrl]

    fun getIssuerUrlFromName(issuerName: String): String? = issuerNameToUrl[issuerName.lowercase()]
}