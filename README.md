<!-- ENTETE -->
![Lifecycle:Maturing](https://img.shields.io/badge/Lifecycle-Maturing-007EC6)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

---

<div>
    <a target="_blank" href="https://www.quebec.ca/gouvernement/ministere/cybersecurite-numerique">
      <img src="https://github.com/CQEN-QDCE/.github/blob/main/images/mcn.png" alt="Logo du Ministère de la cybersécurité et du numérique" />
    </a>
</div>
<!-- FIN ENTETE -->


![Lifecycle:Maturing](https://img.shields.io/badge/Lifecycle-Maturing-007EC6)
[![Native Build & Test](https://github.com/bcgov/bc-wallet-mobile/actions/workflows/main.yaml/badge.svg?branch=main)](https://github.com/bcgov/bc-wallet-mobile/actions/workflows/main.yaml)

# Table of Contents
<!-- TOC -->
* [Prerequisite](#prerequisite)
* [Overall Architecture](#overall-architecture)
<!-- TOC -->

# Prerequisite
Before running the mobile app it is expected to the following services up and running. (Either locally or hosted
somewhere on the internet.)

1. [Von-Network Blockchain Ledger](https://github.com/bcgov/von-network)
2. [Mediator](https://github.com/hyperledger/aries-mediator-service)
3. [Credential Issuer](https://github.com/bcgov/issuer-kit)
4. An account in [NgRok](https://dashboard.ngrok.com/get-started/setup)
5. Follow the steps in the [Developer Guide](DEVELOPER.md)

# Overall Architecture
How BC Wallet Mobile App fits in a larger picture?

![](<./docs/BCWallet_Architecture.png>)



