//
//  Common.swift
//  jose
//
//  Created by marcosc on 2016-12-08.
//  Copyright © 2016 idim. All rights reserved.
//

import Foundation

struct JOSEException: Error {
    let description: String
    init(_ description: String) {
        self.description = description
    }
}
